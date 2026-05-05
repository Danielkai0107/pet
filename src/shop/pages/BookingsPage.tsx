import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Inbox, ChevronRight, Search } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { Spinner } from "@/components/Spinner";
import { Badge } from "@/components/Badge";
import { fmtDate, fmtMoney } from "@/lib/format";
import {
  BOOKING_STATUS_COLOR,
  BOOKING_STATUS_LABEL,
  PET_TYPE_LABEL,
} from "@/lib/constants";
import type { BookingStatus, PetType } from "@/lib/types";
import { useShopAuth } from "@/shop/auth/useShopAuth";
import { useBookings } from "@/shop/hooks/useBookings";
import { PageHeader } from "@/shop/components/PageHeader";

const TABS: { key: BookingStatus | "all"; label: string }[] = [
  { key: "pending", label: "待確認" },
  { key: "confirmed", label: "已確認" },
  { key: "checked_in", label: "入住中" },
  { key: "checked_out", label: "已退房" },
  { key: "all", label: "全部" },
];

export function ShopBookingsPage() {
  const { shop } = useShopAuth();
  const [tab, setTab] = useState<BookingStatus | "all">("pending");
  const [keyword, setKeyword] = useState("");

  const { bookings, loading } = useBookings({
    shopId: shop?.id,
    status: tab,
    realtime: true,
  });

  const filtered = useMemo(() => {
    const k = keyword.trim().toLowerCase();
    if (!k) return bookings;
    return bookings.filter(
      (b) =>
        b.guest_name.toLowerCase().includes(k) ||
        b.guest_phone.includes(k) ||
        b.pet_name.toLowerCase().includes(k) ||
        b.code.toLowerCase().includes(k),
    );
  }, [bookings, keyword]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <PageHeader title="預約管理" description="即時收發消費者預約" />

      <div className="card mb-4 p-4">
        <div className="flex flex-wrap items-center gap-2">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={
                "rounded-full border px-3 py-1.5 text-sm font-medium transition-colors " +
                (tab === t.key
                  ? "border-brand-500 bg-brand-50 text-brand-700"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50")
              }
            >
              {t.label}
            </button>
          ))}
          <div className="relative ml-auto w-full sm:w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              className="input pl-10"
              placeholder="搜尋姓名 / 手機 / 訂單號"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="card">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Spinner />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={Inbox} title="目前沒有預約" />
        ) : (
          <ul className="divide-y divide-slate-100">
            {filtered.map((b) => (
              <li key={b.id}>
                <Link
                  to={`/shop/bookings/${b.id}`}
                  className="flex items-center gap-3 p-4 transition-colors hover:bg-slate-50"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs text-slate-500">
                        {b.code}
                      </span>
                      <Badge className={BOOKING_STATUS_COLOR[b.status]}>
                        {BOOKING_STATUS_LABEL[b.status]}
                      </Badge>
                    </div>
                    <p className="mt-1 truncate font-semibold text-slate-900">
                      {b.guest_name} · {b.pet_name}（
                      {PET_TYPE_LABEL[b.pet_type as PetType]}）
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {fmtDate(b.check_in_date)} → {fmtDate(b.check_out_date)} ·{" "}
                      {b.nights} 晚 · {fmtMoney(b.total_price)}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
