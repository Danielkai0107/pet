import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Bed,
  Calendar,
  CheckCircle2,
  LogIn,
  LogOut,
  Mail,
  Phone,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import { Spinner } from "@/components/Spinner";
import { Badge } from "@/components/Badge";
import { fmtDate, fmtDateTime, fmtMoney, formatPhone } from "@/lib/format";
import {
  BOOKING_STATUS_COLOR,
  BOOKING_STATUS_LABEL,
  PET_SIZE_LABEL,
  PET_TYPE_LABEL,
} from "@/lib/constants";
import { supabase, formatSupabaseError } from "@/lib/supabase";
import type { Booking, BookingStatus, PetSize, PetType, Room } from "@/lib/types";
import { sendBookingEmail } from "@/lib/email";
import { sendBookingLine } from "@/lib/notify";
import { PageHeader } from "@/shop/components/PageHeader";

export function ShopBookingDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [room, setRoom] = useState<Room | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const reload = async () => {
    if (!id) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("bookings")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) {
      toast.error(formatSupabaseError(error));
      setLoading(false);
      return;
    }
    if (!data) {
      setLoading(false);
      return;
    }
    setBooking(data as Booking);
    const { data: r } = await supabase
      .from("rooms")
      .select("*")
      .eq("id", data.room_id)
      .maybeSingle();
    setRoom((r as Room) ?? null);
    setLoading(false);
  };

  useEffect(() => {
    void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const updateStatus = async (
    next: BookingStatus,
    timestampField?:
      | "confirmed_at"
      | "declined_at"
      | "cancelled_at"
      | "checked_in_at"
      | "checked_out_at",
    notifyKind?:
      | "booking_confirmed"
      | "booking_declined"
      | "booking_cancelled"
      | "checked_in"
      | "checked_out"
      | null,
  ) => {
    if (!booking) return;
    setBusy(true);
    const patch: Record<string, unknown> = { status: next };
    if (timestampField) patch[timestampField] = new Date().toISOString();
    const { error } = await supabase
      .from("bookings")
      .update(patch)
      .eq("id", booking.id);
    setBusy(false);
    if (error) {
      toast.error(formatSupabaseError(error));
      return;
    }
    if (notifyKind) {
      // Email only for the lifecycle events that warrant a long-form
      // notification (skip for check-in / check-out — LINE-only).
      if (
        notifyKind === "booking_confirmed" ||
        notifyKind === "booking_declined" ||
        notifyKind === "booking_cancelled"
      ) {
        void sendBookingEmail({ bookingId: booking.id, kind: notifyKind }).catch(
          () => undefined,
        );
      }
      void sendBookingLine({ bookingId: booking.id, kind: notifyKind }).catch(
        () => undefined,
      );
    }
    toast.success("已更新");
    await reload();
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Spinner />
      </div>
    );
  }
  if (!booking) {
    return (
      <div className="mx-auto max-w-md py-16 text-center text-sm text-slate-500">
        找不到這筆預約
      </div>
    );
  }

  const canConfirm = booking.status === "pending";
  const canDecline = booking.status === "pending";
  const canCheckIn = booking.status === "confirmed";
  const canCheckOut = booking.status === "checked_in";
  const canCancel =
    booking.status === "pending" || booking.status === "confirmed";

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <button
        onClick={() => navigate("/shop/bookings")}
        className="btn-ghost mb-3 text-sm"
      >
        <ArrowLeft className="h-4 w-4" />
        回預約列表
      </button>

      <PageHeader
        title={`預約 ${booking.code}`}
        description={`建立於 ${fmtDateTime(booking.created_at)}`}
        action={
          <Badge className={BOOKING_STATUS_COLOR[booking.status]}>
            {BOOKING_STATUS_LABEL[booking.status]}
          </Badge>
        }
      />

      <div className="grid gap-4 md:grid-cols-2">
        <Section title="入住資訊">
          <Row icon={Calendar} label="入住">
            {fmtDate(booking.check_in_date)}
          </Row>
          <Row icon={Calendar} label="退房">
            {fmtDate(booking.check_out_date)}
          </Row>
          <Row icon={Bed} label="房型">
            {room?.name ?? "—"}
          </Row>
          <Row icon={Bed} label="夜數">
            {booking.nights} 晚
          </Row>
          <Row icon={Bed} label="費用">
            <span className="font-bold text-brand-700">
              {fmtMoney(booking.total_price)}
            </span>
          </Row>
        </Section>

        <Section title="客戶與寵物">
          <Row label="姓名">{booking.guest_name}</Row>
          <Row icon={Phone} label="手機">
            <a
              className="text-brand-700 hover:underline"
              href={`tel:${booking.guest_phone}`}
            >
              {formatPhone(booking.guest_phone)}
            </a>
          </Row>
          <Row icon={Mail} label="Email">
            <a
              className="text-brand-700 hover:underline"
              href={`mailto:${booking.guest_email}`}
            >
              {booking.guest_email}
            </a>
          </Row>
          <Row label="寵物">
            {booking.pet_name}
            <span className="ml-1 text-xs text-slate-500">
              ({PET_TYPE_LABEL[booking.pet_type as PetType]}
              {booking.pet_size
                ? ` · ${PET_SIZE_LABEL.default[booking.pet_size as PetSize]}`
                : ""}
              {booking.pet_breed ? ` · ${booking.pet_breed}` : ""})
            </span>
          </Row>
          {booking.pet_note && <Row label="寵物備註">{booking.pet_note}</Row>}
          {booking.guest_note && <Row label="客戶留言">{booking.guest_note}</Row>}
        </Section>
      </div>

      <div className="card mt-4 p-4">
        <h3 className="mb-3 text-sm font-semibold text-slate-700">操作</h3>
        <div className="flex flex-wrap gap-2">
          {canConfirm && (
            <button
              className="btn-primary"
              disabled={busy}
              onClick={() =>
                updateStatus("confirmed", "confirmed_at", "booking_confirmed")
              }
            >
              <CheckCircle2 className="h-4 w-4" />
              確認預約
            </button>
          )}
          {canDecline && (
            <button
              className="btn-secondary"
              disabled={busy}
              onClick={() => {
                if (!confirm("確定拒絕這筆預約？")) return;
                void updateStatus(
                  "declined",
                  "declined_at",
                  "booking_declined",
                );
              }}
            >
              <X className="h-4 w-4" />
              拒絕
            </button>
          )}
          {canCheckIn && (
            <button
              className="btn-primary"
              disabled={busy}
              onClick={() =>
                updateStatus("checked_in", "checked_in_at", "checked_in")
              }
            >
              <LogIn className="h-4 w-4" />
              標記入住
            </button>
          )}
          {canCheckOut && (
            <button
              className="btn-primary"
              disabled={busy}
              onClick={() =>
                updateStatus("checked_out", "checked_out_at", "checked_out")
              }
            >
              <LogOut className="h-4 w-4" />
              標記退房
            </button>
          )}
          {canCancel && (
            <button
              className="btn-ghost text-rose-600"
              disabled={busy}
              onClick={() => {
                if (!confirm("確定取消這筆預約？")) return;
                void updateStatus(
                  "cancelled",
                  "cancelled_at",
                  "booking_cancelled",
                );
              }}
            >
              <X className="h-4 w-4" />
              取消預約
            </button>
          )}
        </div>
      </div>

      <div className="card mt-4 p-4">
        <h3 className="mb-3 text-sm font-semibold text-slate-700">時間軸</h3>
        <Timeline booking={booking} />
      </div>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="card p-5">
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-500">
        {title}
      </h3>
      <dl className="space-y-2">{children}</dl>
    </div>
  );
}

function Row({
  icon: Icon,
  label,
  children,
}: {
  icon?: typeof Calendar;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 border-b border-slate-100 pb-2 last:border-0">
      <span className="flex w-20 shrink-0 items-center gap-1 text-xs font-medium text-slate-500">
        {Icon && <Icon className="h-3.5 w-3.5" />}
        {label}
      </span>
      <span className="flex-1 text-sm text-slate-900">{children}</span>
    </div>
  );
}

function Timeline({ booking }: { booking: Booking }) {
  const items = [
    { at: booking.created_at, label: "建立" },
    { at: booking.confirmed_at, label: "已確認" },
    { at: booking.declined_at, label: "已拒絕" },
    { at: booking.checked_in_at, label: "入住" },
    { at: booking.checked_out_at, label: "退房" },
    { at: booking.cancelled_at, label: "取消" },
  ].filter((x) => x.at);

  return (
    <ol className="space-y-2">
      {items.map((it, i) => (
        <li key={i} className="flex items-center gap-3 text-sm">
          <span className="h-2 w-2 rounded-full bg-brand-500" />
          <span className="font-medium text-slate-900">{it.label}</span>
          <span className="text-xs text-slate-500">
            {fmtDateTime(it.at as string)}
          </span>
        </li>
      ))}
    </ol>
  );
}
