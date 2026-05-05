import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { addDays, addMonths, format, parseISO } from "date-fns";
import { Bed, Info, PawPrint } from "lucide-react";
import toast from "react-hot-toast";
import { Spinner } from "@/components/Spinner";
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
    <div className="bg-white pb-28 sm:pb-12">
      {/* 頂部：只放步驟指示。不放底線，讓 content 區無上下邊框。
          LIFF 加上安全區留白避免被 LINE 狀態列遮住。 */}
      <div
        className={
          "sticky top-0 z-20 bg-white" +
          (isLiff ? " pt-[max(env(safe-area-inset-top),0px)]" : "")
        }
      >
        <div className="mx-auto max-w-2xl px-4 py-4">
          <Steps step={step} />
        </div>
      </div>

      <div className="mx-auto max-w-2xl px-4 pt-6">
        {step === "dates" && (
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-neutral-900">
              選擇入住日期
            </h1>
            <p className="mt-1 text-sm text-neutral-500">
              點選入住日 → 再點退房日
            </p>
            <div className="mt-5">
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
              <div className="mt-5 border-t border-neutral-200 pt-4 text-sm text-neutral-700">
                <p>
                  <span className="font-semibold text-neutral-900">
                    {fmtDate(checkIn)}
                  </span>{" "}
                  入住 →{" "}
                  <span className="font-semibold text-neutral-900">
                    {fmtDate(checkOut)}
                  </span>{" "}
                  退房
                </p>
                <p className="mt-1 text-xs text-neutral-500">
                  共 {nightsBetween(checkIn, checkOut)} 晚
                </p>
              </div>
            )}
          </div>
        )}

        {step === "room" && (
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-neutral-900">
              選擇房型
            </h1>
            <p className="mt-1 text-sm text-neutral-500">
              {fmtDate(checkIn!)} → {fmtDate(checkOut!)}（
              {nightsBetween(checkIn!, checkOut!)} 晚）
            </p>

            <div className="mt-5 space-y-3">
              {eligibleRooms.length === 0 ? (
                <div className="flex items-start gap-2 rounded-card border border-neutral-200 px-4 py-3 text-sm text-neutral-700">
                  <Info className="mt-0.5 h-4 w-4 shrink-0 text-neutral-500" />
                  <span>您選擇的日期區間內沒有可訂房型，請回上一步調整日期。</span>
                </div>
              ) : (
                eligibleRooms.map((r) => {
                  const cover = r.photo_urls?.[0];
                  const isSelected = selectedRoomId === r.id;
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setSelectedRoomId(r.id)}
                      className={
                        "flex w-full items-stretch gap-3 overflow-hidden rounded-card border bg-white p-0 text-left transition-shadow hover:shadow-md " +
                        (isSelected
                          ? "border-brand-500 ring-2 ring-brand-500/20"
                          : "border-neutral-200")
                      }
                    >
                      <div className="relative aspect-[4/3] w-32 shrink-0 overflow-hidden bg-neutral-100 sm:w-40">
                        {cover ? (
                          <img
                            src={cover}
                            alt={r.name}
                            className="h-full w-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-neutral-300">
                            <Bed className="h-8 w-8" />
                          </div>
                        )}
                        {r.photo_urls && r.photo_urls.length > 1 && (
                          <span className="absolute bottom-1.5 right-1.5 rounded-full bg-white/95 px-2 py-0.5 text-[10px] font-medium text-neutral-700 shadow-sm">
                            {r.photo_urls.length} 張
                          </span>
                        )}
                      </div>
                      <div className="flex flex-1 flex-col py-3 pr-4">
                        <p className="text-base font-semibold text-neutral-900">
                          {r.name}
                        </p>
                        {r.description && (
                          <p className="mt-0.5 line-clamp-2 text-xs text-neutral-500">
                            {r.description}
                          </p>
                        )}
                        <div className="mt-2 flex flex-wrap gap-1">
                          {r.pet_types.map((p) => (
                            <span key={p} className="tag-outline">
                              {PET_TYPE_LABEL[p as PetType]}
                            </span>
                          ))}
                        </div>
                        <div className="mt-auto flex items-end justify-between gap-2 pt-2">
                          <p className="text-[11px] text-neutral-500">
                            共 {nightsBetween(checkIn!, checkOut!)} 晚
                          </p>
                          <p className="text-base font-bold text-neutral-900">
                            {fmtMoney(totalForRoom(r))}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}

        {step === "guest" && selectedRoom && (
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-neutral-900">
              填寫您的資料
            </h1>
            <p className="mt-1 text-sm text-neutral-500">
              店家會以 Email 與您聯繫確認預約
            </p>

            <div className="mt-5 space-y-5">
              <fieldset className="space-y-3">
                <legend className="text-sm font-semibold text-neutral-900">
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

              <fieldset className="space-y-3 border-t border-neutral-200 pt-5">
                <legend className="text-sm font-semibold text-neutral-900">
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
            <h1 className="text-2xl font-bold tracking-tight text-neutral-900">
              確認訂單資訊
            </h1>
            <p className="mt-1 text-sm text-neutral-500">
              送出前請再確認以下資訊
            </p>

            <dl className="mt-5 divide-y divide-neutral-100 rounded-card border border-neutral-200">
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
              <Row
                label="寵物"
                value={`${guest.pet_name} (${PET_TYPE_LABEL[guest.pet_type]})`}
              />
              {guest.guest_note && <Row label="備註" value={guest.guest_note} />}
            </dl>

            <div className="mt-5 flex items-end justify-between border-t border-neutral-200 pt-5">
              <div>
                <p className="text-sm text-neutral-700">預估費用</p>
                <p className="mt-0.5 text-[11px] text-neutral-500">
                  確切金額以店家確認後為準
                </p>
              </div>
              <p className="text-2xl font-bold text-neutral-900">
                {fmtMoney(totalForRoom(selectedRoom))}
              </p>
            </div>

            <p className="mt-4 flex items-start gap-1.5 text-xs text-neutral-500">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              送出後店家會盡快確認，結果將以 Email 通知。
            </p>
          </div>
        )}
      </div>

      {/* sticky 底部按鈕：mobile 釘底，desktop 為一般 inline 區。
          第一步顯示「返回」(回到商家頁)，其它步驟顯示「上一步」。
          所有按鈕不放 icon，文字導向。 */}
      <div className="sticky-bottom-bar mt-8">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-3">
          {step === "dates" ? (
            <Link
              to={`${shopPrefix}/${slug}`}
              className="btn-secondary"
            >
              返回
            </Link>
          ) : (
            <button className="btn-secondary" onClick={goBack}>
              上一步
            </button>
          )}
          {step !== "review" ? (
            <button
              className="btn-primary flex-1 justify-center"
              onClick={goNext}
            >
              下一步
            </button>
          ) : (
            <button
              className="btn-primary flex-1 justify-center"
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

/**
 * Airbnb 風進度線：4 條等寬橫條 — 已完成/當前段是 brand-500，
 * 未到的段是 neutral-200。下方是當前步驟標題。
 */
function Steps({ step }: { step: Step }) {
  const order: { key: Step; label: string }[] = [
    { key: "dates", label: "日期" },
    { key: "room", label: "房型" },
    { key: "guest", label: "資料" },
    { key: "review", label: "確認" },
  ];
  const idx = order.findIndex((o) => o.key === step);
  return (
    <div>
      <div className="flex items-center gap-1.5">
        {order.map((o, i) => (
          <div
            key={o.key}
            className={
              "h-1 flex-1 rounded-full " +
              (i <= idx ? "bg-brand-500" : "bg-neutral-200")
            }
          />
        ))}
      </div>
      <div className="mt-3 flex justify-between text-sm font-medium">
        {order.map((o, i) => (
          <span
            key={o.key}
            className={i === idx ? "text-neutral-900" : "text-neutral-400"}
          >
            {i + 1}. {o.label}
          </span>
        ))}
      </div>
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
    <div className="flex items-start gap-4 px-4 py-3">
      <span className="w-20 shrink-0 text-sm text-neutral-500">{label}</span>
      <span className="flex-1 text-sm font-medium text-neutral-900">
        {value}
      </span>
    </div>
  );
}
