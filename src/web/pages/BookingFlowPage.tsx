import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { addDays, addMonths, format, parseISO } from "date-fns";
import { ArrowLeft, ArrowRight, Bed, CheckCircle2, PawPrint } from "lucide-react";
import toast from "react-hot-toast";
import { Spinner } from "@/components/Spinner";
import { Badge } from "@/components/Badge";
import { EmptyState } from "@/components/EmptyState";
import { fmtDate, fmtMoney, nightsBetween } from "@/lib/format";
import { PET_SIZE_LABEL, PET_TYPE_LABEL } from "@/lib/constants";
import { supabase, formatSupabaseError } from "@/lib/supabase";
import type { PetSize, PetType, Room, RoomAvailabilityDay } from "@/lib/types";
import { sendBookingEmail } from "@/lib/email";
import { sendBookingLine } from "@/lib/notify";
import { useShopBySlug } from "@/web/hooks/useShopBySlug";
import { DateRangePicker } from "@/web/components/DateRangePicker";
import { useRoutePrefix } from "@/lib/useRoutePrefix";
import { useOptionalLiffAuth } from "@/liff/auth/useOptionalLiffAuth";

type Step = "dates" | "room" | "guest" | "review";

interface GuestForm {
  guest_name: string;
  guest_phone: string;
  guest_email: string;
  guest_note: string;
  pet_name: string;
  pet_type: PetType;
  pet_size: PetSize;
  pet_breed: string;
  pet_note: string;
}

const initialGuest: GuestForm = {
  guest_name: "",
  guest_phone: "",
  guest_email: "",
  guest_note: "",
  pet_name: "",
  pet_type: "dog",
  pet_size: "small",
  pet_breed: "",
  pet_note: "",
};

export function BookingFlowPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { data, loading, error } = useShopBySlug(slug);
  const { shopPrefix, bookingSuccessPrefix, isLiff } = useRoutePrefix();
  const liffAuth = useOptionalLiffAuth();

  const [step, setStep] = useState<Step>("dates");
  const [checkIn, setCheckIn] = useState<string | null>(null);
  const [checkOut, setCheckOut] = useState<string | null>(null);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [guest, setGuest] = useState<GuestForm>(initialGuest);
  const [submitting, setSubmitting] = useState(false);

  // Pre-fill guest form from the LINE customer record once it loads.
  useEffect(() => {
    if (!isLiff || !liffAuth?.customer) return;
    setGuest((g) => ({
      ...g,
      guest_name: g.guest_name || liffAuth.profile?.displayName || "",
      guest_email: g.guest_email || liffAuth.customer?.email || "",
      guest_phone: g.guest_phone || liffAuth.customer?.phone || "",
    }));
  }, [isLiff, liffAuth?.customer, liffAuth?.profile?.displayName]);

  // Per-room availability map for next 3 months
  const [availabilityByRoom, setAvailabilityByRoom] = useState<
    Map<string, Map<string, RoomAvailabilityDay>>
  >(new Map());
  const [availLoading, setAvailLoading] = useState(false);

  useEffect(() => {
    if (!data) return;
    let cancelled = false;
    (async () => {
      setAvailLoading(true);
      const start = format(new Date(), "yyyy-MM-dd");
      const end = format(addDays(addMonths(new Date(), 3), 1), "yyyy-MM-dd");
      const next = new Map<string, Map<string, RoomAvailabilityDay>>();
      for (const room of data.rooms) {
        const { data: days, error: err } = await supabase.rpc(
          "get_room_availability",
          { p_room_id: room.id, p_start: start, p_end: end },
        );
        if (cancelled) return;
        if (err) {
          console.warn("[booking] avail err", err);
          continue;
        }
        const m = new Map<string, RoomAvailabilityDay>();
        (days as RoomAvailabilityDay[]).forEach((d) => m.set(d.date, d));
        next.set(room.id, m);
      }
      if (cancelled) return;
      setAvailabilityByRoom(next);
      setAvailLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [data]);

  const selectedRoom = useMemo<Room | undefined>(
    () => data?.rooms.find((r) => r.id === selectedRoomId),
    [data, selectedRoomId],
  );

  // Combined availability across rooms for the date picker on dates step.
  const combinedAvailability = useMemo(() => {
    const m = new Map<string, number>();
    if (!data) return m;
    for (const room of data.rooms) {
      const roomMap = availabilityByRoom.get(room.id);
      if (!roomMap) continue;
      roomMap.forEach((day) => {
        m.set(day.date, (m.get(day.date) ?? 0) + Math.max(0, day.available));
      });
    }
    return m;
  }, [data, availabilityByRoom]);

  // For the room step: if a room has a full day in the chosen range -> not eligible
  const eligibleRooms = useMemo(() => {
    if (!data || !checkIn || !checkOut) return [];
    return data.rooms.filter((r) => {
      const m = availabilityByRoom.get(r.id);
      if (!m) return false;
      const start = parseISO(checkIn);
      const end = parseISO(checkOut);
      let d = start;
      while (d < end) {
        const day = m.get(format(d, "yyyy-MM-dd"));
        if (!day || day.available <= 0) return false;
        d = addDays(d, 1);
      }
      return true;
    });
  }, [data, checkIn, checkOut, availabilityByRoom]);

  const totalForRoom = (room: Room): number => {
    if (!checkIn || !checkOut) return 0;
    const m = availabilityByRoom.get(room.id);
    if (!m) return room.price_per_night * nightsBetween(checkIn, checkOut);
    const start = parseISO(checkIn);
    const end = parseISO(checkOut);
    let d = start;
    let total = 0;
    while (d < end) {
      const day = m.get(format(d, "yyyy-MM-dd"));
      total += day?.price ?? room.price_per_night;
      d = addDays(d, 1);
    }
    return total;
  };

  const goNext = () => {
    if (step === "dates") {
      if (!checkIn || !checkOut) {
        toast.error("請選擇入住與退房日期");
        return;
      }
      setStep("room");
    } else if (step === "room") {
      if (!selectedRoomId) {
        toast.error("請選擇一個房型");
        return;
      }
      setStep("guest");
    } else if (step === "guest") {
      const required: (keyof GuestForm)[] = [
        "guest_name",
        "guest_phone",
        "guest_email",
        "pet_name",
      ];
      for (const f of required) {
        if (!String(guest[f]).trim()) {
          toast.error("請填寫必填欄位");
          return;
        }
      }
      if (!/^\S+@\S+\.\S+$/.test(guest.guest_email)) {
        toast.error("Email 格式不正確");
        return;
      }
      setStep("review");
    }
  };

  const goBack = () => {
    if (step === "room") setStep("dates");
    else if (step === "guest") setStep("room");
    else if (step === "review") setStep("guest");
  };

  const handleSubmit = async () => {
    if (!selectedRoom || !checkIn || !checkOut) return;
    setSubmitting(true);
    const { data: result, error: err } = await supabase.rpc("create_booking", {
      p_room_id: selectedRoom.id,
      p_guest_name: guest.guest_name,
      p_guest_phone: guest.guest_phone,
      p_guest_email: guest.guest_email,
      p_guest_note: guest.guest_note || null,
      p_pet_name: guest.pet_name,
      p_pet_type: guest.pet_type,
      p_pet_size: guest.pet_size,
      p_pet_breed: guest.pet_breed || null,
      p_pet_note: guest.pet_note || null,
      p_check_in_date: checkIn,
      p_check_out_date: checkOut,
    });
    if (err) {
      setSubmitting(false);
      toast.error(formatSupabaseError(err));
      return;
    }
    const created = (Array.isArray(result) ? result[0] : result) as
      | { booking_id: string; booking_code: string }
      | undefined;
    if (!created) {
      setSubmitting(false);
      toast.error("建立預約失敗");
      return;
    }

    // Fire-and-forget email; failure shouldn't block the user.
    void sendBookingEmail({
      bookingId: created.booking_id,
      kind: "booking_received",
    }).catch(() => undefined);

    // In LIFF: implicitly bind this LINE user to the booking's phone/email,
    // so this booking + any past web bookings with the same phone show up
    // on the user's "我的訂單" page. We must await this before firing the
    // LINE notify so notify-line can resolve a line_user_id.
    if (isLiff && liffAuth?.idToken) {
      try {
        await supabase.functions.invoke("line-claim-booking", {
          body: {
            idToken: liffAuth.idToken,
            phone: guest.guest_phone,
            email: guest.guest_email,
            bookingId: created.booking_id,
          },
        });
        void liffAuth.refresh().catch(() => undefined);
      } catch (e) {
        console.warn("[booking] line-claim-booking failed", e);
      }
    }

    // Push the "已收到預約" Flex card. Server no-ops if there's still no
    // bound LINE user (e.g. guest-only web booking).
    void sendBookingLine({
      bookingId: created.booking_id,
      kind: "booking_received",
    }).catch(() => undefined);

    toast.success("預約已送出！");
    navigate(`${bookingSuccessPrefix}/${created.booking_code}`);
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Spinner />
      </div>
    );
  }
  if (error || !data) {
    return (
      <div className="mx-auto max-w-md py-16">
        <EmptyState
          icon={PawPrint}
          title="找不到這家寵物旅館"
          description={error ?? undefined}
          action={
            <Link to="/shops" className="btn-primary">
              看其他旅館
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="bg-slate-50 pb-24 sm:pb-8">
      {/* 頂部：返回 + 步驟指示 */}
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-4 px-4 py-3">
          <Link
            to={`${shopPrefix}/${slug}`}
            className="inline-flex min-w-0 items-center gap-1.5 text-sm text-slate-700 hover:text-brand-700"
          >
            <ArrowLeft className="h-4 w-4 shrink-0" />
            <span className="truncate">{data.shop.name}</span>
          </Link>
          <Steps step={step} />
        </div>
      </div>

      <div className="mx-auto max-w-2xl px-4 pt-4">
        <div className="card p-5 sm:p-6">
        {step === "dates" && (
          <div>
            <h1 className="text-xl font-bold text-slate-900">選擇入住日期</h1>
            <p className="mt-1 text-sm text-slate-500">
              點選入住日 → 再點退房日
            </p>
            <div className="mt-4">
              <DateRangePicker
                checkIn={checkIn}
                checkOut={checkOut}
                onChange={(ci, co) => {
                  setCheckIn(ci);
                  setCheckOut(co);
                  if (ci !== checkIn) setSelectedRoomId(null);
                }}
                availability={combinedAvailability}
                loading={availLoading}
              />
            </div>
            {checkIn && checkOut && (
              <div className="mt-4 rounded-xl bg-brand-50 p-3 text-sm text-brand-800">
                <strong>{fmtDate(checkIn)}</strong> 入住 →{" "}
                <strong>{fmtDate(checkOut)}</strong> 退房，共{" "}
                <strong>{nightsBetween(checkIn, checkOut)}</strong> 晚
              </div>
            )}
          </div>
        )}

        {step === "room" && (
          <div>
            <h1 className="text-xl font-bold text-slate-900">選擇房型</h1>
            <p className="mt-1 text-sm text-slate-500">
              {fmtDate(checkIn!)} → {fmtDate(checkOut!)}（
              {nightsBetween(checkIn!, checkOut!)} 晚）
            </p>

            <div className="mt-4 space-y-3">
              {eligibleRooms.length === 0 ? (
                <div className="rounded-xl bg-amber-50 p-4 text-sm text-amber-800">
                  您選擇的日期區間內沒有可訂房型，請回上一步調整日期。
                </div>
              ) : (
                eligibleRooms.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setSelectedRoomId(r.id)}
                    className={
                      "card flex w-full items-start gap-3 p-4 text-left transition-all " +
                      (selectedRoomId === r.id
                        ? "ring-2 ring-brand-500"
                        : "hover:shadow-md")
                    }
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                      <Bed className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-slate-900">{r.name}</p>
                      {r.description && (
                        <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">
                          {r.description}
                        </p>
                      )}
                      <div className="mt-2 flex flex-wrap gap-1">
                        {r.pet_types.map((p) => (
                          <Badge key={p} className="bg-slate-100 text-slate-700">
                            {PET_TYPE_LABEL[p as PetType]}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-brand-700">
                        {fmtMoney(totalForRoom(r))}
                      </p>
                      <p className="text-xs text-slate-500">
                        共 {nightsBetween(checkIn!, checkOut!)} 晚
                      </p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        )}

        {step === "guest" && selectedRoom && (
          <div>
            <h1 className="text-xl font-bold text-slate-900">填寫您的資料</h1>
            <p className="mt-1 text-sm text-slate-500">
              店家會以 Email 與您聯繫確認預約
            </p>

            <div className="mt-4 space-y-4">
              <fieldset className="space-y-3">
                <legend className="text-sm font-semibold text-slate-700">
                  您的聯絡資料
                </legend>
                <Input
                  label="姓名 *"
                  value={guest.guest_name}
                  onChange={(v) => setGuest({ ...guest, guest_name: v })}
                />
                <div className="grid gap-3 sm:grid-cols-2">
                  <Input
                    label="手機 *"
                    type="tel"
                    value={guest.guest_phone}
                    onChange={(v) => setGuest({ ...guest, guest_phone: v })}
                  />
                  <Input
                    label="Email *"
                    type="email"
                    value={guest.guest_email}
                    onChange={(v) => setGuest({ ...guest, guest_email: v })}
                  />
                </div>
                <Textarea
                  label="給店家的話"
                  value={guest.guest_note}
                  onChange={(v) => setGuest({ ...guest, guest_note: v })}
                />
              </fieldset>

              <fieldset className="space-y-3 border-t border-slate-100 pt-4">
                <legend className="text-sm font-semibold text-slate-700">
                  寵物資料
                </legend>
                <Input
                  label="寵物名字 *"
                  value={guest.pet_name}
                  onChange={(v) => setGuest({ ...guest, pet_name: v })}
                />
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="label">類型</label>
                    <select
                      className="input"
                      value={guest.pet_type}
                      onChange={(e) =>
                        setGuest({
                          ...guest,
                          pet_type: e.target.value as PetType,
                        })
                      }
                    >
                      {selectedRoom.pet_types.map((p) => (
                        <option key={p} value={p}>
                          {PET_TYPE_LABEL[p as PetType]}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="label">體型</label>
                    <select
                      className="input"
                      value={guest.pet_size}
                      onChange={(e) =>
                        setGuest({
                          ...guest,
                          pet_size: e.target.value as PetSize,
                        })
                      }
                    >
                      {selectedRoom.pet_sizes.map((s) => (
                        <option key={s} value={s}>
                          {PET_SIZE_LABEL.default[s]}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <Input
                  label="品種（選填）"
                  value={guest.pet_breed}
                  onChange={(v) => setGuest({ ...guest, pet_breed: v })}
                />
                <Textarea
                  label="寵物個性 / 特殊需求（選填）"
                  value={guest.pet_note}
                  onChange={(v) => setGuest({ ...guest, pet_note: v })}
                />
              </fieldset>
            </div>
          </div>
        )}

        {step === "review" && selectedRoom && (
          <div>
            <h1 className="text-xl font-bold text-slate-900">確認訂單資訊</h1>
            <div className="mt-4 space-y-3">
              <Row label="店家" value={data.shop.name} />
              <Row
                label="入住"
                value={`${fmtDate(checkIn!)} (週${["日","一","二","三","四","五","六"][parseISO(checkIn!).getDay()]})`}
              />
              <Row
                label="退房"
                value={`${fmtDate(checkOut!)} (週${["日","一","二","三","四","五","六"][parseISO(checkOut!).getDay()]})`}
              />
              <Row
                label="夜數"
                value={`${nightsBetween(checkIn!, checkOut!)} 晚`}
              />
              <Row label="房型" value={selectedRoom.name} />
              <Row label="姓名" value={guest.guest_name} />
              <Row label="手機" value={guest.guest_phone} />
              <Row label="Email" value={guest.guest_email} />
              <Row label="寵物" value={`${guest.pet_name} (${PET_TYPE_LABEL[guest.pet_type]})`} />
              {guest.guest_note && <Row label="備註" value={guest.guest_note} />}

              <div className="flex items-center justify-between rounded-lg bg-price-50 p-4">
                <div>
                  <p className="text-xs text-slate-600">預估費用</p>
                  <p className="text-[10px] text-slate-500">
                    確切金額以店家確認後為準
                  </p>
                </div>
                <p className="price-lg">
                  {fmtMoney(totalForRoom(selectedRoom)).replace("NT$ ", "")}
                </p>
              </div>

              <div className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
                <CheckCircle2 className="mr-1 inline h-4 w-4" />
                送出後店家會盡快確認，結果將以 Email 通知。
              </div>
            </div>
          </div>
        )}
        </div>
      </div>

      {/* sticky 底部按鈕：mobile 釘底，desktop 為一般 inline 區 */}
      <div className="sticky-bottom-bar mt-4">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-3">
          {step !== "dates" ? (
            <button className="btn-secondary" onClick={goBack}>
              <ArrowLeft className="h-4 w-4" />
              上一步
            </button>
          ) : (
            <span />
          )}
          {step !== "review" ? (
            <button className="btn-cta flex-1 justify-center" onClick={goNext}>
              下一步
              <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              className="btn-cta flex-1 justify-center"
              onClick={handleSubmit}
              disabled={submitting}
            >
              {submitting && <Spinner size="sm" />}
              送出預約
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Steps({ step }: { step: Step }) {
  const order: { key: Step; label: string }[] = [
    { key: "dates", label: "日期" },
    { key: "room", label: "房型" },
    { key: "guest", label: "資料" },
    { key: "review", label: "確認" },
  ];
  const idx = order.findIndex((o) => o.key === step);
  return (
    <div className="flex items-center gap-1.5 text-[11px]">
      {order.map((o, i) => (
        <div key={o.key} className="flex items-center gap-1.5">
          <span
            className={
              "flex h-5 w-5 items-center justify-center rounded-full font-semibold " +
              (i <= idx
                ? "bg-brand-600 text-white"
                : "bg-slate-200 text-slate-400")
            }
          >
            {i + 1}
          </span>
          <span
            className={
              "hidden font-medium sm:inline " +
              (i === idx ? "text-slate-900" : "text-slate-500")
            }
          >
            {o.label}
          </span>
          {i < order.length - 1 && (
            <span className="h-px w-3 bg-slate-200 sm:w-5" />
          )}
        </div>
      ))}
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <div>
      <label className="label">{label}</label>
      <input
        className="input"
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

function Textarea({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="label">{label}</label>
      <textarea
        rows={3}
        className="input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start gap-4 border-b border-slate-100 pb-2 last:border-0">
      <span className="w-20 shrink-0 text-sm text-slate-500">{label}</span>
      <span className="flex-1 text-sm font-medium text-slate-900">{value}</span>
    </div>
  );
}
