import { Link } from "react-router-dom";
import { PawPrint } from "lucide-react";
import { StatusDot } from "@/components/StatusDot";
import { fmtDate, fmtMoney } from "@/lib/format";
import type { LineBookingWithRefs } from "@/liff/hooks/useLineOrders";

/**
 * Airbnb 風 LIFF 訂單卡：
 *   - 上方 16:10 商家封面圖（純白底，圖片是唯一視覺重心）
 *   - 圖外的標題列顯示店名 + 訂單編號（小字）
 *   - 狀態用 dot+text 顯示在標題上方一行
 *   - 價格、日期、房型、寵物以資訊清單呈現，無背景色塊
 */
export function BookingCard({ booking }: { booking: LineBookingWithRefs }) {
  const cover = booking.shop?.cover_image_url;
  const location = [booking.shop?.city, booking.shop?.district]
    .filter(Boolean)
    .join(" ");

  return (
    <Link
      to={`/liff/booking/${booking.code}`}
      className="block overflow-hidden rounded-card border border-neutral-200 bg-white transition-shadow hover:shadow-md"
    >
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-neutral-100">
        {cover ? (
          <img
            src={cover}
            alt={booking.shop?.name ?? ""}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-neutral-300">
            <PawPrint className="h-10 w-10" />
          </div>
        )}
      </div>

      <div className="p-4">
        <div className="flex items-center justify-between gap-2">
          <StatusDot status={booking.status} />
          <span className="font-mono text-[11px] text-neutral-400">
            {booking.code}
          </span>
        </div>

        <h3 className="mt-2 truncate text-base font-semibold text-neutral-900">
          {booking.shop?.name ?? "—"}
        </h3>
        {location && (
          <p className="mt-0.5 truncate text-xs text-neutral-500">{location}</p>
        )}

        <dl className="mt-3 grid grid-cols-[auto,1fr] gap-x-4 gap-y-1 text-xs">
          <dt className="text-neutral-500">入住</dt>
          <dd className="text-neutral-900">
            {fmtDate(booking.check_in_date)} → {fmtDate(booking.check_out_date)}
            <span className="ml-1 text-neutral-400">· {booking.nights} 晚</span>
          </dd>
          <dt className="text-neutral-500">房型</dt>
          <dd className="truncate text-neutral-900">
            {booking.room?.name ?? "—"}
          </dd>
          <dt className="text-neutral-500">寵物</dt>
          <dd className="truncate text-neutral-900">{booking.pet_name}</dd>
        </dl>

        <div className="mt-3 flex items-baseline justify-between border-t border-neutral-100 pt-3">
          <span className="text-xs text-neutral-500">總價</span>
          <span className="text-base font-bold text-neutral-900">
            {fmtMoney(booking.total_price)}
          </span>
        </div>
      </div>
    </Link>
  );
}
