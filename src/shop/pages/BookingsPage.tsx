import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Inbox, Search } from "lucide-react";
import { format } from "date-fns";
import { EmptyState } from "@/components/EmptyState";
import { Spinner } from "@/components/Spinner";
import { StatusDot } from "@/components/StatusDot";
import { fmtDate, fmtMoney } from "@/lib/format";
import { PET_TYPE_LABEL } from "@/lib/constants";
import type { Booking, PetType } from "@/lib/types";
import { useShopAuth } from "@/shop/auth/useShopAuth";
import { useBookings } from "@/shop/hooks/useBookings";
import { PageHeader } from "@/shop/components/PageHeader";
import { BookingDetailModal } from "@/shop/components/BookingDetailModal";

/** Tab key — covers DB `BookingStatus` plus two compound tabs that filter by today's date. */
type TabKey =
  | "pending"
  | "today_check_in"
  | "confirmed"
  | "checked_in"
  | "today_check_out"
  | "checked_out"
  | "all";

const TABS: { key: TabKey; label: string }[] = [
  { key: "pending", label: "待確認" },
  { key: "today_check_in", label: "今日入住" },
  { key: "confirmed", label: "已確認" },
  { key: "checked_in", label: "在住中" },
  { key: "today_check_out", label: "今日退房" },
  { key: "checked_out", label: "已退房" },
  { key: "all", label: "全部" },
];

const VALID_TABS = new Set(TABS.map((t) => t.key));

export function ShopBookingsPage() {
  const { shop } = useShopAuth();
  const [params, setParams] = useSearchParams();
  const initialTab = (params.get("tab") as TabKey) ?? "pending";
  const [tab, setTab] = useState<TabKey>(
    VALID_TABS.has(initialTab) ? initialTab : "pending",
  );
  const [keyword, setKeyword] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  // Sync tab → URL search param so links from TodayPage stat cards work
  // and refreshing the page preserves selection.
  useEffect(() => {
    const next = new URLSearchParams(params);
    if (tab === "pending") next.delete("tab");
    else next.set("tab", tab);
    setParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  // 後端只能用單一 status 篩；今日入住 / 今日退房 兩個複合 tab 需要 client side
  // 結合「狀態 + 今日日期」過濾，因此查 "all"。
  const dbStatus = useMemo(() => {
    if (tab === "today_check_in" || tab === "today_check_out") return "all";
    return tab;
  }, [tab]);

  const { bookings, loading } = useBookings({
    shopId: shop?.id,
    status: dbStatus,
    realtime: true,
  });

  const today = format(new Date(), "yyyy-MM-dd");

  const filtered = useMemo(() => {
    let list: Booking[] = bookings;

    // 今日入住：confirmed + checked_in 且 check_in_date == today
    if (tab === "today_check_in") {
      list = list.filter(
        (b) =>
          b.check_in_date === today &&
          (b.status === "confirmed" || b.status === "checked_in"),
      );
    }
    // 今日退房：checked_in + checked_out 且 check_out_date == today
    if (tab === "today_check_out") {
      list = list.filter(
        (b) =>
          b.check_out_date === today &&
          (b.status === "checked_in" || b.status === "checked_out"),
      );
    }

    const k = keyword.trim().toLowerCase();
    if (!k) return list;
    return list.filter(
      (b) =>
        b.guest_name.toLowerCase().includes(k) ||
        b.guest_phone.includes(k) ||
        b.pet_name.toLowerCase().includes(k) ||
        b.code.toLowerCase().includes(k),
    );
  }, [bookings, keyword, tab, today]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <PageHeader title="預約管理" description="即時收發消費者預約" />

      <div className="flex flex-col gap-3 border-b border-neutral-200">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={
                "tab-underline whitespace-nowrap" +
                (tab === t.key ? " tab-underline-active" : "")
              }
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="relative pb-3 sm:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <input
            className="input pl-10"
            placeholder="搜尋姓名 / 手機 / 訂單號"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
          />
        </div>
      </div>

      <div className="mt-4 overflow-hidden rounded-card border border-neutral-200 bg-white">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Spinner />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={Inbox} title="目前沒有預約" />
        ) : (
          <ul className="divide-y divide-neutral-100">
            {filtered.map((b) => (
              <li key={b.id}>
                <button
                  type="button"
                  onClick={() => setOpenId(b.id)}
                  className="flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-neutral-50"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs text-neutral-500">
                        {b.code}
                      </span>
                      <StatusDot status={b.status} />
                    </div>
                    <p className="mt-1 truncate font-semibold text-neutral-900">
                      {b.guest_name} · {b.pet_name}（
                      {PET_TYPE_LABEL[b.pet_type as PetType]}）
                    </p>
                    <p className="mt-0.5 text-xs text-neutral-500">
                      {fmtDate(b.check_in_date)} → {fmtDate(b.check_out_date)} ·{" "}
                      {b.nights} 晚 · {fmtMoney(b.total_price)}
                    </p>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <BookingDetailModal
        bookingId={openId}
        onClose={() => setOpenId(null)}
      />
    </div>
  );
}
