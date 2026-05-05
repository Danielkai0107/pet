import { useEffect, useState } from "react";
import { Calendar } from "lucide-react";
import toast from "react-hot-toast";
import { Spinner } from "@/components/Spinner";
import { Badge } from "@/components/Badge";
import { EmptyState } from "@/components/EmptyState";
import { fmtDate, fmtDateTime, fmtMoney } from "@/lib/format";
import {
  BOOKING_STATUS_COLOR,
  BOOKING_STATUS_LABEL,
} from "@/lib/constants";
import { supabase, formatSupabaseError } from "@/lib/supabase";
import type { Booking } from "@/lib/types";

interface BookingWithShop extends Booking {
  shop: { name: string; slug: string } | null;
}

export function AdminBookingsPage() {
  const [bookings, setBookings] = useState<BookingWithShop[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("bookings")
        .select("*, shop:shops(name, slug)")
        .order("created_at", { ascending: false })
        .limit(200);
      if (cancelled) return;
      if (error) {
        toast.error(formatSupabaseError(error));
        setBookings([]);
      } else {
        setBookings((data ?? []) as BookingWithShop[]);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <header className="mb-5">
        <h1 className="text-2xl font-bold text-slate-900">全平台訂單</h1>
        <p className="mt-1 text-sm text-slate-600">最近 200 筆訂單</p>
      </header>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Spinner />
          </div>
        ) : bookings.length === 0 ? (
          <EmptyState icon={Calendar} title="尚無訂單" />
        ) : (
          <ul className="divide-y divide-slate-100">
            {bookings.map((b) => (
              <li key={b.id} className="p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs text-slate-500">
                    {b.code}
                  </span>
                  <Badge className={BOOKING_STATUS_COLOR[b.status]}>
                    {BOOKING_STATUS_LABEL[b.status]}
                  </Badge>
                  <span className="text-sm font-semibold text-slate-900">
                    {b.shop?.name ?? "—"}
                  </span>
                </div>
                <p className="mt-1 text-sm text-slate-700">
                  {b.guest_name} · {b.pet_name}
                </p>
                <p className="mt-0.5 text-xs text-slate-500">
                  {fmtDate(b.check_in_date)} → {fmtDate(b.check_out_date)} ·{" "}
                  {b.nights} 晚 · {fmtMoney(b.total_price)} ·{" "}
                  建立 {fmtDateTime(b.created_at)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
