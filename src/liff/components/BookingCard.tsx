import { Calendar, MapPin } from "lucide-react";
import { Badge } from "@/components/Badge";
import { fmtDate, fmtMoney } from "@/lib/format";
import {
  BOOKING_STATUS_COLOR,
  BOOKING_STATUS_LABEL,
} from "@/lib/constants";
import type { LineBookingWithRefs } from "@/liff/hooks/useLineOrders";

export function BookingCard({ booking }: { booking: LineBookingWithRefs }) {
  return (
    <article className="card overflow-hidden">
      <div className="flex items-start gap-3 p-4">
        <div
          className="h-14 w-14 shrink-0 rounded-xl bg-slate-100 bg-cover bg-center"
          style={
            booking.shop?.cover_image_url
              ? { backgroundImage: `url(${booking.shop.cover_image_url})` }
              : undefined
          }
        />
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge className={BOOKING_STATUS_COLOR[booking.status]}>
              {BOOKING_STATUS_LABEL[booking.status]}
            </Badge>
            <span className="font-mono text-[11px] text-slate-500">
              {booking.code}
            </span>
          </div>
          <h3 className="mt-1 truncate font-semibold text-slate-900">
            {booking.shop?.name ?? "—"}
          </h3>
          {booking.shop?.city && (
            <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-500">
              <MapPin className="h-3 w-3" />
              {[booking.shop.city, booking.shop.district].filter(Boolean).join(" ")}
            </p>
          )}
        </div>
      </div>
      <div className="border-t border-slate-100 bg-slate-50/50 px-4 py-3 text-xs">
        <div className="flex items-center gap-2 text-slate-600">
          <Calendar className="h-3.5 w-3.5" />
          <span>
            {fmtDate(booking.check_in_date)} → {fmtDate(booking.check_out_date)}（
            {booking.nights} 晚）
          </span>
        </div>
        <div className="mt-1 flex items-center justify-between text-slate-600">
          <span>
            {booking.pet_name} · {booking.room?.name}
          </span>
          <strong className="text-brand-700">{fmtMoney(booking.total_price)}</strong>
        </div>
      </div>
    </article>
  );
}
