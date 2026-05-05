import { useEffect, useState } from "react";
import {
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
import { StatusDot } from "@/components/StatusDot";
import { fmtDate, fmtDateTime, fmtMoney, formatPhone } from "@/lib/format";
import { useManagedOptions } from "@/lib/managedOptions";
import { supabase, formatSupabaseError } from "@/lib/supabase";
import type { Booking, BookingStatus, Room } from "@/lib/types";
import { sendBookingEmail } from "@/lib/email";
import { sendBookingLine } from "@/lib/notify";

interface Props {
  bookingId: string;
  /** Notify parent when status changes so list views can refresh. */
  onChanged?: () => void;
}

/**
 * 預約詳情 — 共用內容塊。
 *   - 不含 PageHeader / 返回鍵 / 外層 padding
 *   - 可塞進 Modal（popup 模式）或頁面（route 模式）
 *   - 包含資料載入、4 個操作按鈕、時間軸
 */
export function BookingDetailContent({ bookingId, onChanged }: Props) {
  const [booking, setBooking] = useState<Booking | null>(null);
  const [room, setRoom] = useState<Room | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const { petTypeLabel, petSizeLabel } = useManagedOptions();

  const reload = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("bookings")
      .select("*")
      .eq("id", bookingId)
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
  }, [bookingId]);

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
    onChanged?.();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner />
      </div>
    );
  }
  if (!booking) {
    return (
      <p className="py-8 text-center text-sm text-neutral-500">
        找不到這筆預約
      </p>
    );
  }

  const canConfirm = booking.status === "pending";
  const canDecline = booking.status === "pending";
  const canCheckIn = booking.status === "confirmed";
  const canCheckOut = booking.status === "checked_in";
  const canCancel =
    booking.status === "pending" || booking.status === "confirmed";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-200 pb-3">
        <div className="flex items-center gap-3">
          <StatusDot status={booking.status} />
          <span className="font-mono text-xs text-neutral-500">
            {booking.code}
          </span>
        </div>
        <span className="text-xs text-neutral-500">
          建立於 {fmtDateTime(booking.created_at)}
        </span>
      </div>

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
            <span className="font-bold text-neutral-900">
              {fmtMoney(booking.total_price)}
            </span>
          </Row>
        </Section>

        <Section title="客戶與寵物">
          <Row label="姓名">{booking.guest_name}</Row>
          <Row icon={Phone} label="手機">
            <a
              className="text-neutral-900 underline decoration-neutral-300 underline-offset-2 hover:decoration-neutral-900"
              href={`tel:${booking.guest_phone}`}
            >
              {formatPhone(booking.guest_phone)}
            </a>
          </Row>
          <Row icon={Mail} label="Email">
            <a
              className="text-neutral-900 underline decoration-neutral-300 underline-offset-2 hover:decoration-neutral-900"
              href={`mailto:${booking.guest_email}`}
            >
              {booking.guest_email}
            </a>
          </Row>
          <Row label="寵物">
            {booking.pet_name}
            <span className="ml-1 text-xs text-neutral-500">
              ({petTypeLabel(booking.pet_type)}
              {booking.pet_size
                ? ` · ${petSizeLabel(booking.pet_type, booking.pet_size)}`
                : ""}
              {booking.pet_breed ? ` · ${booking.pet_breed}` : ""})
            </span>
          </Row>
          {booking.pet_note && <Row label="寵物備註">{booking.pet_note}</Row>}
          {booking.guest_note && (
            <Row label="客戶留言">{booking.guest_note}</Row>
          )}
        </Section>
      </div>

      <div className="rounded-card border border-neutral-200 bg-white p-4">
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-neutral-500">
          操作
        </h3>
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
              className="btn-ghost text-rose-700"
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
          {!canConfirm &&
            !canDecline &&
            !canCheckIn &&
            !canCheckOut &&
            !canCancel && (
              <p className="text-xs text-neutral-500">
                此狀態下沒有可進行的操作
              </p>
            )}
        </div>
      </div>

      <div className="rounded-card border border-neutral-200 bg-white p-4">
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-neutral-500">
          時間軸
        </h3>
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
    <div className="rounded-card border border-neutral-200 bg-white p-5">
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-neutral-500">
        {title}
      </h3>
      <dl className="divide-y divide-neutral-100">{children}</dl>
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
    <div className="flex items-start gap-3 py-2.5 first:pt-0 last:pb-0">
      <span className="flex w-20 shrink-0 items-center gap-1 text-xs font-medium text-neutral-500">
        {Icon && <Icon className="h-3.5 w-3.5" />}
        {label}
      </span>
      <span className="flex-1 text-sm text-neutral-900">{children}</span>
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
          <span className="h-1.5 w-1.5 rounded-full bg-neutral-700" />
          <span className="font-medium text-neutral-900">{it.label}</span>
          <span className="text-xs text-neutral-500">
            {fmtDateTime(it.at as string)}
          </span>
        </li>
      ))}
    </ol>
  );
}
