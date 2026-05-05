import { useEffect, useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  MessageCircle,
  Search,
  User,
  Users,
} from "lucide-react";
import toast from "react-hot-toast";
import { EmptyState } from "@/components/EmptyState";
import { Spinner } from "@/components/Spinner";
import { StatusDot } from "@/components/StatusDot";
import { fmtDate, fmtMoney, formatPhone } from "@/lib/format";
import { supabase, formatSupabaseError } from "@/lib/supabase";
import { useManagedOptions } from "@/lib/managedOptions";
import type { Booking, ShopCustomerSummary } from "@/lib/types";
import { useShopAuth } from "@/shop/auth/useShopAuth";
import { PageHeader } from "@/shop/components/PageHeader";
import { BookingDetailModal } from "@/shop/components/BookingDetailModal";

type LineFilter = "all" | "bound" | "unbound";

const FILTERS: { key: LineFilter; label: string }[] = [
  { key: "all", label: "全部" },
  { key: "bound", label: "已綁 LINE" },
  { key: "unbound", label: "未綁 LINE" },
];

/** Normalise a TW phone (loose) to compare against `guest_phone` after
 *  the same normalisation in the RPC. */
function normalizePhone(p: string): string {
  return p.replace(/[\s\-()]/g, "").replace(/^\+886/, "0");
}

/**
 * 店家後台「客戶管理」— 以正規化後的手機為主鍵彙總本店所有客戶（含
 * walk-in），顯示是否已綁 LINE、訂單數、最近入住、累計消費。
 *   - 點任一列展開：lazy 載入該手機在本店的所有訂單
 *   - 點任一筆訂單：開啟 BookingDetailModal（重用既有元件）
 */
export function ShopCustomersPage() {
  const { shop } = useShopAuth();
  const [customers, setCustomers] = useState<ShopCustomerSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState("");
  const [filter, setFilter] = useState<LineFilter>("all");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [openBookingId, setOpenBookingId] = useState<string | null>(null);

  useEffect(() => {
    if (!shop) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      const { data, error } = await supabase.rpc("get_shop_customers", {
        p_shop_id: shop.id,
      });
      if (cancelled) return;
      if (error) {
        toast.error(formatSupabaseError(error));
        setCustomers([]);
      } else {
        setCustomers((data ?? []) as ShopCustomerSummary[]);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [shop]);

  const filtered = useMemo(() => {
    let list = customers;
    if (filter === "bound") list = list.filter((c) => c.line_bound);
    if (filter === "unbound") list = list.filter((c) => !c.line_bound);
    const k = keyword.trim().toLowerCase();
    if (k) {
      const kPhone = normalizePhone(k);
      list = list.filter(
        (c) =>
          c.name?.toLowerCase().includes(k) ||
          c.phone.includes(kPhone) ||
          c.line_display_name?.toLowerCase().includes(k),
      );
    }
    return list;
  }, [customers, keyword, filter]);

  const stats = useMemo(() => {
    const total = customers.length;
    const bound = customers.filter((c) => c.line_bound).length;
    return { total, bound, unbound: total - bound };
  }, [customers]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <PageHeader
        title="客戶管理"
        description="以手機號碼識別的客戶清單，可查看歷史訂單與 LINE 綁定狀態"
      />

      <div className="grid grid-cols-3 gap-3">
        <Stat label="客戶總數" value={stats.total} />
        <Stat label="已綁 LINE" value={stats.bound} accent />
        <Stat label="未綁 LINE" value={stats.unbound} />
      </div>

      <div className="mt-5 flex flex-col gap-3 border-b border-neutral-200 pb-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative sm:max-w-sm sm:flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <input
            className="input pl-10"
            placeholder="搜尋姓名 / 手機 / LINE 暱稱"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={
                "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors " +
                (filter === f.key
                  ? "border-neutral-900 bg-neutral-900 text-white"
                  : "border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50")
              }
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 overflow-hidden rounded-card border border-neutral-200 bg-white">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Spinner />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Users}
            title={
              customers.length === 0 ? "目前還沒有客戶" : "沒有符合條件的客戶"
            }
          />
        ) : (
          <ul className="divide-y divide-neutral-100">
            {filtered.map((c) => (
              <CustomerRow
                key={c.phone}
                customer={c}
                shopId={shop?.id ?? ""}
                expanded={expanded === c.phone}
                onToggle={() =>
                  setExpanded((prev) => (prev === c.phone ? null : c.phone))
                }
                onOpenBooking={(id) => setOpenBookingId(id)}
              />
            ))}
          </ul>
        )}
      </div>

      <BookingDetailModal
        bookingId={openBookingId}
        onClose={() => setOpenBookingId(null)}
      />
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: boolean;
}) {
  return (
    <div
      className={
        "rounded-card border bg-white p-4 " +
        (accent ? "border-emerald-300" : "border-neutral-200")
      }
    >
      <p className="text-xs font-medium text-neutral-500">{label}</p>
      <p className="mt-1.5 text-2xl font-bold tracking-tight text-neutral-900">
        {value}
      </p>
    </div>
  );
}

function CustomerRow({
  customer,
  shopId,
  expanded,
  onToggle,
  onOpenBooking,
}: {
  customer: ShopCustomerSummary;
  shopId: string;
  expanded: boolean;
  onToggle: () => void;
  onOpenBooking: (id: string) => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-neutral-50"
      >
        <Avatar
          name={customer.name}
          pictureUrl={customer.line_picture_url}
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate font-semibold text-neutral-900">
              {customer.name || "—"}
            </p>
            {customer.line_bound ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                <MessageCircle className="h-3 w-3" />
                LINE 已綁定
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full border border-neutral-200 bg-white px-2 py-0.5 text-[11px] font-medium text-neutral-500">
                未綁 LINE
              </span>
            )}
          </div>
          <p className="mt-0.5 truncate text-xs text-neutral-500">
            <span className="font-mono">{formatPhone(customer.phone)}</span>
            {customer.line_display_name && (
              <span className="ml-2 text-neutral-400">
                · LINE：{customer.line_display_name}
              </span>
            )}
          </p>
        </div>
        <div className="hidden text-right text-xs text-neutral-500 sm:block">
          <p>
            <span className="font-bold text-neutral-900">
              {customer.bookings_count}
            </span>{" "}
            筆訂單
          </p>
          <p className="mt-0.5">
            最近入住：
            {customer.last_check_in
              ? fmtDate(customer.last_check_in)
              : "—"}
          </p>
          <p className="mt-0.5">
            累計：
            <span className="font-medium text-neutral-700">
              {fmtMoney(customer.total_spent)}
            </span>
          </p>
        </div>
        <span className="ml-2 shrink-0 text-neutral-400">
          {expanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </span>
      </button>

      {expanded && (
        <CustomerBookings
          shopId={shopId}
          phone={customer.phone}
          onOpen={onOpenBooking}
        />
      )}
    </li>
  );
}

function Avatar({
  name,
  pictureUrl,
}: {
  name: string | null;
  pictureUrl: string | null;
}) {
  if (pictureUrl) {
    return (
      <img
        src={pictureUrl}
        alt=""
        className="h-10 w-10 shrink-0 rounded-full border border-neutral-200 object-cover"
      />
    );
  }
  const initial = (name ?? "").trim().charAt(0).toUpperCase() || "?";
  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-neutral-200 bg-neutral-50 text-sm font-semibold text-neutral-700">
      {initial === "?" ? <User className="h-5 w-5 text-neutral-400" /> : initial}
    </div>
  );
}

function CustomerBookings({
  shopId,
  phone,
  onOpen,
}: {
  shopId: string;
  phone: string;
  onOpen: (id: string) => void;
}) {
  const [bookings, setBookings] = useState<Booking[] | null>(null);
  const { petTypeLabel } = useManagedOptions();

  useEffect(() => {
    if (!shopId) return;
    let cancelled = false;
    (async () => {
      // We can't apply a normalised match in the client; the simplest
      // approach is to fetch by raw phone (works for most modern web
      // bookings that store digits-only) and also a few trailing-digit
      // variants. Here we just match guest_phone equality first and
      // fall back to a server `ilike` if no result.
      const { data, error } = await supabase
        .from("bookings")
        .select("*")
        .eq("shop_id", shopId)
        .eq("guest_phone", phone)
        .order("check_in_date", { ascending: false });
      if (cancelled) return;
      if (error) {
        toast.error(formatSupabaseError(error));
        setBookings([]);
        return;
      }
      let list = (data ?? []) as Booking[];
      if (list.length === 0) {
        // Try last-7-digit suffix match for legacy data with formatting.
        const tail = phone.slice(-7);
        const { data: fallback } = await supabase
          .from("bookings")
          .select("*")
          .eq("shop_id", shopId)
          .ilike("guest_phone", `%${tail}%`)
          .order("check_in_date", { ascending: false });
        list = (fallback ?? []) as Booking[];
      }
      setBookings(list);
    })();
    return () => {
      cancelled = true;
    };
  }, [shopId, phone]);

  if (bookings === null) {
    return (
      <div className="flex justify-center bg-neutral-50/50 py-6">
        <Spinner size="sm" />
      </div>
    );
  }

  if (bookings.length === 0) {
    return (
      <p className="bg-neutral-50/50 py-6 text-center text-xs text-neutral-400">
        沒有可顯示的訂單
      </p>
    );
  }

  return (
    <ul className="divide-y divide-neutral-100 border-t border-neutral-100 bg-neutral-50/50">
      {bookings.map((b) => (
        <li key={b.id}>
          <button
            type="button"
            onClick={() => onOpen(b.id)}
            className="flex w-full items-center gap-3 px-5 py-3 text-left transition-colors hover:bg-white"
          >
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-[11px] text-neutral-500">
                  {b.code}
                </span>
                <StatusDot status={b.status} />
              </div>
              <p className="mt-0.5 truncate text-sm text-neutral-900">
                {b.pet_name}
                <span className="ml-1 text-xs text-neutral-500">
                  ({petTypeLabel(b.pet_type)})
                </span>
              </p>
              <p className="mt-0.5 text-xs text-neutral-500">
                {fmtDate(b.check_in_date)} → {fmtDate(b.check_out_date)} ·{" "}
                {b.nights} 晚 · {fmtMoney(b.total_price)}
              </p>
            </div>
            <ChevronRight className="h-4 w-4 shrink-0 text-neutral-400" />
          </button>
        </li>
      ))}
    </ul>
  );
}
