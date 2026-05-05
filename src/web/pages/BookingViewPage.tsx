import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowRight,
  Bed,
  Calendar,
  Clock,
  MapPin,
  PawPrint,
  Phone,
} from "lucide-react";
import toast from "react-hot-toast";
import { Spinner } from "@/components/Spinner";
import { EmptyState } from "@/components/EmptyState";
import { StatusDot } from "@/components/StatusDot";
import {
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
import { LiffBackBar } from "@/liff/components/LiffBackBar";

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

const STATUS_DESCRIPTION: Record<BookingStatus, string> = {
  pending: "店家正在處理您的預約，請耐心稍候",
  confirmed: "店家已確認，請於入住當天攜帶寵物用品",
  declined: "店家無法接受此預約",
  cancelled: "此預約已取消",
  checked_in: "已入住，您的毛孩正在被悉心照顧",
  checked_out: "已退房，謝謝您的光顧",
  no_show: "未出席紀錄",
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

  const canCancel =
    booking.status === "pending" || booking.status === "confirmed";
  const locationText = [booking.shop_city, booking.shop_district]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="bg-white pb-28 sm:pb-12">
      {isLiff && <LiffBackBar back="/liff" caption={booking.code} />}
      <div className="mx-auto max-w-2xl px-4 pt-6">
        {/* 狀態列：dot + 文字 + 訂單編號（無大色塊） */}
        <div className="flex items-center justify-between gap-3 border-b border-neutral-200 pb-4">
          <div className="min-w-0">
            <StatusDot status={booking.status} className="text-sm" />
            <p className="mt-1 text-xs text-neutral-500">
              {STATUS_DESCRIPTION[booking.status]}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-wider text-neutral-400">
              訂單編號
            </p>
            <p className="font-mono text-sm font-semibold text-neutral-900">
              {booking.code}
            </p>
          </div>
        </div>

        {/* 店家卡 — 純白 + 細邊 */}
        <Link
          to={`${shopPrefix}/${booking.shop_slug}`}
          className="mt-5 flex items-stretch overflow-hidden rounded-card border border-neutral-200 bg-white transition-shadow hover:shadow-md"
        >
          <div
            className="aspect-square w-24 shrink-0 bg-neutral-100 bg-cover bg-center"
            style={
              booking.shop_cover_image_url
                ? {
                    backgroundImage: `url(${booking.shop_cover_image_url})`,
                  }
                : undefined
            }
          >
            {!booking.shop_cover_image_url && (
              <div className="flex h-full items-center justify-center text-neutral-300">
                <PawPrint className="h-8 w-8" />
              </div>
            )}
          </div>
          <div className="flex min-w-0 flex-1 flex-col justify-center px-4">
            <h2 className="truncate font-semibold text-neutral-900">
              {booking.shop_name}
            </h2>
            {locationText && (
              <p className="mt-0.5 flex items-center gap-1 text-xs text-neutral-500">
                <MapPin className="h-3 w-3 shrink-0" />
                <span className="truncate">{locationText}</span>
              </p>
            )}
            {booking.shop_phone && (
              <p className="mt-0.5 inline-flex items-center gap-1 text-xs text-neutral-700">
                <Phone className="h-3 w-3 shrink-0" />
                {formatPhone(booking.shop_phone)}
              </p>
            )}
          </div>
        </Link>

        {/* 入住資訊 */}
        <section className="mt-5">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
            入住資訊
          </h3>
          <div className="mt-2 grid grid-cols-[1fr,auto,1fr] items-center gap-4 rounded-card border border-neutral-200 px-4 py-4">
            <div>
              <p className="text-[11px] text-neutral-500">入住</p>
              <p className="mt-0.5 text-base font-semibold text-neutral-900">
                {fmtDate(booking.check_in_date)}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-neutral-400">{booking.nights} 晚</p>
              <ArrowRight className="mx-auto h-4 w-4 text-neutral-300" />
            </div>
            <div className="text-right">
              <p className="text-[11px] text-neutral-500">退房</p>
              <p className="mt-0.5 text-base font-semibold text-neutral-900">
                {fmtDate(booking.check_out_date)}
              </p>
            </div>
          </div>

          <dl className="mt-3 divide-y divide-neutral-100 rounded-card border border-neutral-200 text-sm">
            <DataRow icon={Bed} label="房型" value={booking.room_name} />
            <DataRow
              label="總費用"
              value={
                <span className="font-bold text-neutral-900">
                  {fmtMoney(booking.total_price)}
                </span>
              }
            />
          </dl>
        </section>

        {/* 客戶與寵物 */}
        <section className="mt-5">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
            客戶與寵物
          </h3>
          <dl className="mt-2 divide-y divide-neutral-100 rounded-card border border-neutral-200 text-sm">
            <DataRow label="姓名" value={booking.guest_name} />
            <DataRow label="手機" value={formatPhone(booking.guest_phone)} />
            <DataRow label="Email" value={booking.guest_email || "—"} />
            <DataRow
              label="寵物"
              value={
                <>
                  {booking.pet_name}
                  <span className="ml-1 text-xs text-neutral-500">
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

        {/* 時間軸 */}
        <section className="mt-5">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
            訂單時間軸
          </h3>
          <div className="mt-2 rounded-card border border-neutral-200 p-5">
            <Timeline booking={booking} />
          </div>
        </section>

        {/* desktop 操作 */}
        <div className="mt-6 hidden flex-col gap-2 sm:flex">
          <Link
            to={`${shopPrefix}/${booking.shop_slug}`}
            className="btn-secondary justify-center"
          >
            再次預約 {booking.shop_name}
          </Link>
          {canCancel && (
            <button
              type="button"
              onClick={handleCancel}
              disabled={cancelling}
              className="btn-danger justify-center"
            >
              {cancelling && <Spinner size="sm" />}
              取消預約
            </button>
          )}
        </div>
      </div>

      {/* mobile sticky 操作列：純文字按鈕，不放 icon */}
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
                {cancelling && <Spinner size="sm" />}
                取消預約
              </button>
            </>
          ) : (
            <Link
              to={`${shopPrefix}/${booking.shop_slug}`}
              className="btn-primary flex-1 justify-center"
            >
              再次預約 {booking.shop_name}
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
    <div className="flex items-start gap-3 px-4 py-3">
      <span className="flex w-16 shrink-0 items-center gap-1 text-xs text-neutral-500">
        {Icon && <Icon className="h-3.5 w-3.5" />}
        {label}
      </span>
      <span className="flex-1 text-sm text-neutral-900">{value}</span>
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
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-neutral-200 text-neutral-500">
            <Clock className="h-3 w-3" />
          </span>
          <span className="flex-1 text-sm font-medium text-neutral-900">
            {it.label}
          </span>
          <span className="text-xs text-neutral-500">
            {fmtDateTime(it.at as string)}
          </span>
        </li>
      ))}
    </ol>
  );
}
