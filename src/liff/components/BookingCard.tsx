import { Link } from "react-router-dom";
import { Calendar, MapPin, PawPrint } from "lucide-react";
import { Badge } from "@/components/Badge";
import { fmtDate, fmtMoney } from "@/lib/format";
import {
  BOOKING_STATUS_COLOR,
  BOOKING_STATUS_LABEL,
} from "@/lib/constants";
import type { LineBookingWithRefs } from "@/liff/hooks/useLineOrders";

/**
 * LIFF 訂單列表卡片 — inline / Trip.com 風格：
 *   - 上方 21:9 商家封面圖，左上角浮狀態 pill
 *   - 圖片下方顯示店名 + 地址 + 入住日期 + 房型 + 寵物 + 費用
 *   - 沒有封面圖時 fallback 到 brand 色塊 + 占位 icon
 */
export function BookingCard({ booking }: { booking: LineBookingWithRefs }) {
  const cover = booking.shop?.cover_image_url;
  const location = [booking.shop?.city, booking.shop?.district]
    .filter(Boolean)
    .join(" ");

  return (
    <Link
      to={`/liff/booking/${booking.code}`}
      className="card-elevated block overflow-hidden"
    >
      {/* Hero — 商家封面圖 */}
      <div className="relative aspect-[21/9] w-full overflow-hidden bg-gradient-to-br from-brand-100 to-amber-100">
        {cover ? (
          <img
            src={cover}
            alt={booking.shop?.name ?? ""}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-brand-600">
            <PawPrint className="h-10 w-10 opacity-40" />
          </div>
        )}
        {/* 左上角狀態 pill */}
        <div className="absolute left-3 top-3">
          <Badge className={BOOKING_STATUS_COLOR[booking.status]}>
            {BOOKING_STATUS_LABEL[booking.status]}
          </Badge>
        </div>
        {/* 訂單編號 — 右上角 */}
        <div className="absolute right-3 top-3">
          <span className="rounded-md bg-black/55 px-2 py-0.5 font-mono text-[10px] font-medium text-white backdrop-blur-sm">
            {booking.code}
          </span>
        </div>
      </div>

      {/* 內容區 */}
      <div className="p-4">
        <h3 className="truncate font-bold text-slate-900">
          {booking.shop?.name ?? "—"}
        </h3>
        {location && (
          <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-500">
            <MapPin className="h-3 w-3" />
            {location}
          </p>
        )}

        <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-700">
          <Calendar className="h-3.5 w-3.5 text-brand-600" />
          <span>
            {fmtDate(booking.check_in_date)} → {fmtDate(booking.check_out_date)}
          </span>
          <span className="text-slate-400">·</span>
          <span className="text-slate-500">{booking.nights} 晚</span>
        </div>

        <div className="mt-3 flex items-end justify-between gap-2 border-t border-slate-100 pt-3">
          <div className="min-w-0 text-xs text-slate-600">
            <p className="truncate">
              <span className="text-slate-500">房型</span>{" "}
              <span className="font-medium text-slate-900">
                {booking.room?.name ?? "—"}
              </span>
            </p>
            <p className="mt-0.5 truncate">
              <span className="text-slate-500">寵物</span>{" "}
              <span className="font-medium text-slate-900">
                {booking.pet_name}
              </span>
            </p>
          </div>
          <div className="text-right leading-none">
            <p className="text-[10px] text-slate-500">總價</p>
            <p className="mt-0.5 price-md">
              {fmtMoney(booking.total_price).replace("NT$ ", "")}
            </p>
          </div>
        </div>
      </div>
    </Link>
  );
}
