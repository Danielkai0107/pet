import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowRight,
  Bed,
  Calendar,
  CheckCircle2,
  Clock,
  MapPin,
  PawPrint,
  Phone,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import { Spinner } from "@/components/Spinner";
import { EmptyState } from "@/components/EmptyState";
import {
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

// Trip.com 風訂單狀態色：每個狀態給一個飽和色 banner
const STATUS_BANNER: Record<
  BookingStatus,
  { bg: string; description: string }
> = {
  pending: {
    bg: "bg-amber-500",
    description: "店家正在處理您的預約，請耐心稍候",
  },
  confirmed: {
    bg: "bg-emerald-600",
    description: "店家已確認，請於入住當天攜帶寵物用品",
  },
  declined: {
    bg: "bg-rose-600",
    description: "店家無法接受此預約",
  },
  cancelled: {
    bg: "bg-slate-500",
    description: "此預約已取消",
  },
  checked_in: {
    bg: "bg-blue-600",
    description: "已入住，您的毛孩正在被悉心照顧",
  },
  checked_out: {
    bg: "bg-slate-500",
    description: "已退房，謝謝您的光顧",
  },
  no_show: {
    bg: "bg-rose-600",
    description: "未出席紀錄",
  },
};

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

  const banner = STATUS_BANNER[booking.status];
  const canCancel =
    booking.status === "pending" || booking.status === "confirmed";
  const locationText = [booking.shop_city, booking.shop_district]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="bg-slate-50 pb-28 sm:pb-6">
      {/* ====== 狀態 Banner ====== */}
      <section className={`${banner.bg} text-white`}>
        <div className="mx-auto max-w-2xl px-4 py-5">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-wider text-white/80">
                訂單狀態
              </p>
              <h1 className="mt-0.5 text-xl font-bold">
                {BOOKING_STATUS_LABEL[booking.status]}
              </h1>
              <p className="mt-1 text-sm text-white/90">{banner.description}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-wider text-white/80">
                訂單編號
              </p>
              <p className="font-mono text-sm font-semibold">{booking.code}</p>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-2xl px-4 py-4 space-y-3">
        {/* ====== 店家卡 ====== */}
        <Link
          to={`${shopPrefix}/${booking.shop_slug}`}
          className="card-elevated flex items-stretch overflow-hidden"
        >
          <div
            className="aspect-square w-24 shrink-0 bg-gradient-to-br from-brand-100 to-amber-100 bg-cover bg-center"
            style={
              booking.shop_cover_image_url
                ? {
                    backgroundImage: `url(${booking.shop_cover_image_url})`,
                  }
                : undefined
            }
          >
            {!booking.shop_cover_image_url && (
              <div className="flex h-full items-center justify-center text-brand-700">
                <PawPrint className="h-8 w-8 opacity-40" />
              </div>
            )}
          </div>
          <div className="flex min-w-0 flex-1 flex-col justify-center px-4">
            <h2 className="truncate font-bold text-slate-900">
              {booking.shop_name}
            </h2>
            {locationText && (
              <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-500">
                <MapPin className="h-3 w-3 shrink-0" />
                <span className="truncate">{locationText}</span>
              </p>
            )}
            {booking.shop_phone && (
              <p className="mt-0.5 flex items-center gap-1 text-xs text-brand-700">
                <Phone className="h-3 w-3 shrink-0" />
                {formatPhone(booking.shop_phone)}
              </p>
            )}
          </div>
        </Link>

        {/* ====== 入住資訊 ====== */}
        <section className="card p-5">
          <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">
            入住資訊
          </h3>

          {/* 入住 / 退房 + 夜數 (Trip.com 風雙列) */}
          <div className="grid grid-cols-[1fr,auto,1fr] items-center gap-4 rounded-lg bg-slate-50 px-4 py-4">
            <div>
              <p className="text-[11px] text-slate-500">入住</p>
              <p className="mt-0.5 text-base font-bold text-slate-900">
                {fmtDate(booking.check_in_date)}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-slate-400">{booking.nights} 晚</p>
              <ArrowRight className="mx-auto h-4 w-4 text-slate-400" />
            </div>
            <div className="text-right">
              <p className="text-[11px] text-slate-500">退房</p>
              <p className="mt-0.5 text-base font-bold text-slate-900">
                {fmtDate(booking.check_out_date)}
              </p>
            </div>
          </div>

          <dl className="mt-4 space-y-2 text-sm">
            <DataRow icon={Bed} label="房型" value={booking.room_name} />
            <DataRow
              label="總費用"
              value={
                <span className="price-md">
                  {fmtMoney(booking.total_price)}
                </span>
              }
            />
          </dl>
        </section>

        {/* ====== 客戶與寵物 ====== */}
        <section className="card p-5">
          <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">
            客戶與寵物
          </h3>
          <dl className="space-y-2 text-sm">
            <DataRow label="姓名" value={booking.guest_name} />
            <DataRow label="手機" value={formatPhone(booking.guest_phone)} />
            <DataRow label="Email" value={booking.guest_email || "—"} />
            <DataRow
              label="寵物"
              value={
                <>
                  {booking.pet_name}
                  <span className="ml-1 text-xs text-slate-500">
                    ({PET_TYPE_LABEL[booking.pet_type]}
                    {booking.pet_size
                      ? ` · ${PET_SIZE_LABEL.default[booking.pet_size]}`
                      : ""}
                    {booking.pet_breed ? ` · ${booking.pet_breed}` : ""})
                  </span>
                </>
              }
            />
            {booking.pet_note && (
              <DataRow label="寵物備註" value={booking.pet_note} />
            )}
            {booking.guest_note && (
              <DataRow label="給店家" value={booking.guest_note} />
            )}
          </dl>
        </section>

        {/* ====== 時間軸 ====== */}
        <section className="card p-5">
          <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">
            訂單時間軸
          </h3>
          <Timeline booking={booking} />
        </section>

        {/* ====== Desktop 取消按鈕 ====== */}
        <div className="hidden flex-col gap-2 sm:flex">
          <Link to={`${shopPrefix}/${booking.shop_slug}`} className="btn-secondary">
            再次預約 {booking.shop_name}
            <ArrowRight className="h-4 w-4" />
          </Link>
          {canCancel ? (
            <button
              type="button"
              onClick={handleCancel}
              disabled={cancelling}
              className="btn-danger"
            >
              {cancelling ? <Spinner size="sm" /> : <X className="h-4 w-4" />}
              取消預約
            </button>
          ) : booking.status === "cancelled" ? (
            <div className="rounded-lg bg-slate-100 p-3 text-center text-sm text-slate-600">
              <CheckCircle2 className="mr-1 inline h-4 w-4" />
              這筆預約已取消
            </div>
          ) : null}
        </div>
      </div>

      {/* ====== Mobile sticky bottom 取消 / 再次預約 ====== */}
      <div className="sticky-bottom-bar sm:hidden">
        <div className="flex items-center gap-2">
          {canCancel ? (
            <>
              <Link
                to={`${shopPrefix}/${booking.shop_slug}`}
                className="btn-secondary flex-1 justify-center"
              >
                再次預約
              </Link>
              <button
                type="button"
                onClick={handleCancel}
                disabled={cancelling}
                className="btn-danger flex-1 justify-center"
              >
                {cancelling ? <Spinner size="sm" /> : <X className="h-4 w-4" />}
                取消預約
              </button>
            </>
          ) : (
            <Link
              to={`${shopPrefix}/${booking.shop_slug}`}
              className="btn-cta flex-1 justify-center"
            >
              再次預約 {booking.shop_name}
              <ArrowRight className="h-4 w-4" />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

function DataRow({
  icon: Icon,
  label,
  value,
}: {
  icon?: typeof Calendar;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex w-16 shrink-0 items-center gap-1 text-xs text-slate-500">
        {Icon && <Icon className="h-3.5 w-3.5" />}
        {label}
      </span>
      <span className="flex-1 text-sm text-slate-900">{value}</span>
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
    <ol className="space-y-3">
      {items.map((it, i) => (
        <li key={i} className="flex items-center gap-3">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-700">
            <Clock className="h-3 w-3" />
          </span>
          <span className="flex-1 text-sm font-medium text-slate-900">
            {it.label}
          </span>
          <span className="text-xs text-slate-500">
            {fmtDateTime(it.at as string)}
          </span>
        </li>
      ))}
    </ol>
  );
}
