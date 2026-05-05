import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowRight,
  Bed,
  Calendar,
  CheckCircle2,
  MapPin,
  PawPrint,
  Phone,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import { Spinner } from "@/components/Spinner";
import { Badge } from "@/components/Badge";
import { EmptyState } from "@/components/EmptyState";
import {
  BOOKING_STATUS_COLOR,
  BOOKING_STATUS_LABEL,
  PET_SIZE_LABEL,
  PET_TYPE_LABEL,
} from "@/lib/constants";
import {
  fmtDate,
  fmtDateTime,
  fmtMoney,
  formatPhone,
} from "@/lib/format";
import { supabase, formatSupabaseError } from "@/lib/supabase";
import type { BookingStatus, PetSize, PetType } from "@/lib/types";
import { sendBookingEmail } from "@/lib/email";
import { sendBookingLine } from "@/lib/notify";
import { useRoutePrefix } from "@/lib/useRoutePrefix";

interface BookingViewRow {
  id: string;
  code: string;
  shop_id: string;
  shop_name: string;
  shop_slug: string;
  shop_phone: string | null;
  shop_city: string | null;
  shop_district: string | null;
  shop_address: string | null;
  shop_cover_image_url: string | null;
  room_id: string;
  room_name: string;
  guest_name: string;
  guest_phone: string;
  guest_email: string;
  guest_note: string | null;
  pet_name: string;
  pet_type: PetType;
  pet_size: PetSize | null;
  pet_breed: string | null;
  pet_note: string | null;
  check_in_date: string;
  check_out_date: string;
  nights: number;
  total_price: number;
  status: BookingStatus;
  source: string;
  created_at: string;
  confirmed_at: string | null;
  declined_at: string | null;
  cancelled_at: string | null;
  checked_in_at: string | null;
  checked_out_at: string | null;
}

export function BookingViewPage() {
  const { code } = useParams<{ code: string }>();
  const { isLiff, shopPrefix } = useRoutePrefix();
  const [booking, setBooking] = useState<BookingViewRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [notFound, setNotFound] = useState(false);

  const reload = async () => {
    if (!code) return;
    setLoading(true);
    const { data, error } = await supabase.rpc("get_booking_by_code", {
      p_code: code,
    });
    if (error) {
      toast.error(formatSupabaseError(error));
      setLoading(false);
      return;
    }
    const row = (Array.isArray(data) ? data[0] : data) as
      | BookingViewRow
      | undefined;
    if (!row) {
      setNotFound(true);
    } else {
      setBooking(row);
    }
    setLoading(false);
  };

  useEffect(() => {
    void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  const handleCancel = async () => {
    if (!booking) return;
    if (!confirm("確定要取消這筆預約嗎？取消後無法復原。")) return;
    setCancelling(true);
    const { error } = await supabase.rpc("cancel_booking_by_code", {
      p_code: booking.code,
    });
    setCancelling(false);
    if (error) {
      toast.error(formatSupabaseError(error));
      return;
    }
    toast.success("已為您取消預約");
    void sendBookingEmail({
      bookingId: booking.id,
      kind: "booking_cancelled",
    }).catch(() => undefined);
    void sendBookingLine({
      bookingId: booking.id,
      kind: "booking_cancelled",
    }).catch(() => undefined);
    await reload();
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Spinner />
      </div>
    );
  }
  if (notFound || !booking) {
    return (
      <div className="mx-auto max-w-md py-16">
        <EmptyState
          icon={PawPrint}
          title="找不到這筆訂單"
          description="連結可能已失效，或訂單編號有誤。"
          action={
            <Link to={isLiff ? "/liff" : "/"} className="btn-primary">
              {isLiff ? "回我的訂單" : "回首頁"}
            </Link>
          }
        />
      </div>
    );
  }

  const canCancel =
    booking.status === "pending" || booking.status === "confirmed";

  const locationText = [booking.shop_city, booking.shop_district]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <div className="card overflow-hidden">
        <div
          className="aspect-[16/9] w-full bg-gradient-to-br from-brand-100 to-amber-100 bg-cover bg-center"
          style={
            booking.shop_cover_image_url
              ? { backgroundImage: `url(${booking.shop_cover_image_url})` }
              : undefined
          }
        >
          {!booking.shop_cover_image_url && (
            <div className="flex h-full items-center justify-center text-brand-700">
              <PawPrint className="h-12 w-12 opacity-50" />
            </div>
          )}
        </div>

        <div className="p-5">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className={BOOKING_STATUS_COLOR[booking.status]}>
              {BOOKING_STATUS_LABEL[booking.status]}
            </Badge>
            <span className="font-mono text-xs text-slate-500">
              訂單 {booking.code}
            </span>
          </div>
          <h1 className="mt-2 text-xl font-bold text-slate-900">
            {booking.shop_name}
          </h1>
          {locationText && (
            <p className="mt-1 flex items-center gap-1 text-sm text-slate-500">
              <MapPin className="h-4 w-4" />
              {locationText}
              {booking.shop_address && (
                <span className="ml-1 truncate">· {booking.shop_address}</span>
              )}
            </p>
          )}
          {booking.shop_phone && (
            <a
              href={`tel:${booking.shop_phone}`}
              className="mt-1 inline-flex items-center gap-1 text-sm text-brand-700 hover:underline"
            >
              <Phone className="h-4 w-4" />
              {formatPhone(booking.shop_phone)}
            </a>
          )}
        </div>
      </div>

      <Section title="入住資訊" className="mt-4">
        <Row icon={Calendar} label="入住">
          {fmtDate(booking.check_in_date)}
        </Row>
        <Row icon={Calendar} label="退房">
          {fmtDate(booking.check_out_date)}
        </Row>
        <Row label="夜數">{booking.nights} 晚</Row>
        <Row icon={Bed} label="房型">
          {booking.room_name}
        </Row>
        <Row label="費用">
          <span className="text-base font-bold text-brand-700">
            {fmtMoney(booking.total_price)}
          </span>
        </Row>
      </Section>

      <Section title="客戶與寵物" className="mt-3">
        <Row label="姓名">{booking.guest_name}</Row>
        <Row label="手機">{formatPhone(booking.guest_phone)}</Row>
        <Row label="Email">{booking.guest_email}</Row>
        <Row label="寵物">
          {booking.pet_name}
          <span className="ml-1 text-xs text-slate-500">
            ({PET_TYPE_LABEL[booking.pet_type]}
            {booking.pet_size
              ? ` · ${PET_SIZE_LABEL.default[booking.pet_size]}`
              : ""}
            {booking.pet_breed ? ` · ${booking.pet_breed}` : ""})
          </span>
        </Row>
        {booking.pet_note && <Row label="寵物備註">{booking.pet_note}</Row>}
        {booking.guest_note && <Row label="給店家">{booking.guest_note}</Row>}
      </Section>

      <Section title="訂單時間軸" className="mt-3">
        <Timeline booking={booking} />
      </Section>

      <div className="mt-4 flex flex-col gap-2">
        <Link to={`${shopPrefix}/${booking.shop_slug}`} className="btn-ghost">
          再次預約 {booking.shop_name}
          <ArrowRight className="h-4 w-4" />
        </Link>

        {canCancel ? (
          <button
            type="button"
            onClick={handleCancel}
            disabled={cancelling}
            className="btn-secondary border border-rose-200 bg-white text-rose-600 hover:bg-rose-50"
          >
            {cancelling ? (
              <Spinner size="sm" />
            ) : (
              <X className="h-4 w-4" />
            )}
            取消預約
          </button>
        ) : booking.status === "cancelled" ? (
          <div className="rounded-xl bg-slate-100 p-3 text-center text-sm text-slate-600">
            <CheckCircle2 className="mr-1 inline h-4 w-4" />
            這筆預約已取消
          </div>
        ) : null}
      </div>
    </div>
  );
}

function Section({
  title,
  className,
  children,
}: {
  title: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`card p-5 ${className ?? ""}`}>
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
        {title}
      </h2>
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

function Timeline({ booking }: { booking: BookingViewRow }) {
  const items = [
    { at: booking.created_at, label: "訂單建立" },
    { at: booking.confirmed_at, label: "店家已確認" },
    { at: booking.declined_at, label: "店家已拒絕" },
    { at: booking.checked_in_at, label: "已入住" },
    { at: booking.checked_out_at, label: "已退房" },
    { at: booking.cancelled_at, label: "已取消" },
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
