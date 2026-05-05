import { useEffect, useMemo, useState } from "react";
import {
  BellRing,
  ChevronRight,
  Info,
  Search,
  User,
  Users,
} from "lucide-react";
import toast from "react-hot-toast";
import { EmptyState } from "@/components/EmptyState";
import { Modal } from "@/components/Modal";
import { Spinner } from "@/components/Spinner";
import { StatusDot } from "@/components/StatusDot";
import { fmtDate, fmtMoney, formatPhone } from "@/lib/format";
import { PLATFORM_NAME } from "@/lib/constants";
import { supabase, formatSupabaseError } from "@/lib/supabase";
import { useManagedOptions } from "@/lib/managedOptions";
import type { Booking, ShopCustomerSummary } from "@/lib/types";
import { useShopAuth } from "@/shop/auth/useShopAuth";
import { PageHeader } from "@/shop/components/PageHeader";
import { BookingDetailModal } from "@/shop/components/BookingDetailModal";

type NotifyFilter = "all" | "enabled" | "disabled";

const FILTERS: { key: NotifyFilter; label: string }[] = [
  { key: "all", label: "全部" },
  { key: "enabled", label: "可圖文通知" },
  { key: "disabled", label: "未開通" },
];

const NOTIFY_HINT = `需請客戶加入 ${PLATFORM_NAME} 官方帳號並完成手機綁定，店家報平安、預約通知才會自動推送到客戶 LINE。`;

/** Normalise a TW phone (loose) to compare against `guest_phone` after
 *  the same normalisation in the RPC. */
function normalizePhone(p: string): string {
  return p.replace(/[\s\-()]/g, "").replace(/^\+886/, "0");
}

/**
 * 店家後台「客戶管理」— 以正規化後的手機為主鍵彙總本店所有客戶（含
 * walk-in），顯示「可否圖文通知」、訂單數、最近入住、累計消費。
 *
 * 「圖文通知」= 客戶已加入 {PLATFORM_NAME} 官方帳號並完成手機綁定，
 * 店家後台一律用此措辭，避免店家誤以為是自己的 LINE OA。
 *
 *   - 點任一列：開啟「客戶詳情」popup，顯示客戶資料 + 該手機在本店的訂單
 *   - 詳情內點任一筆訂單：開啟既有 BookingDetailModal
 */
export function ShopCustomersPage() {
  const { shop } = useShopAuth();
  const [customers, setCustomers] = useState<ShopCustomerSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState("");
  const [filter, setFilter] = useState<NotifyFilter>("all");
  const [openCustomer, setOpenCustomer] = useState<ShopCustomerSummary | null>(
    null,
  );
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
    if (filter === "enabled") list = list.filter((c) => c.line_bound);
    if (filter === "disabled") list = list.filter((c) => !c.line_bound);
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
    const enabled = customers.filter((c) => c.line_bound).length;
    return { total, enabled, disabled: total - enabled };
  }, [customers]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <PageHeader
        title="客戶管理"
        description="以手機號碼識別的客戶清單，可查看歷史訂單與圖文通知開通狀態"
      />

      <div className="grid grid-cols-3 gap-3">
        <Stat label="客戶總數" value={stats.total} />
        <Stat label="可圖文通知" value={stats.enabled} accent />
        <Stat label="未開通" value={stats.disabled} />
      </div>

      <div className="mt-3 inline-flex items-start gap-2 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-[11px] text-neutral-600">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-neutral-400" />
        <span>{NOTIFY_HINT}</span>
      </div>

      <div className="mt-5 flex flex-col gap-3 border-b border-neutral-200 pb-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative sm:max-w-sm sm:flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <input
            className="input pl-10"
            placeholder="搜尋姓名 / 手機 / 通知暱稱"
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
                onOpen={() => setOpenCustomer(c)}
              />
            ))}
          </ul>
        )}
      </div>

      <CustomerDetailModal
        customer={openCustomer}
        shopId={shop?.id ?? ""}
        onClose={() => setOpenCustomer(null)}
        onOpenBooking={(id) => setOpenBookingId(id)}
      />

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
  onOpen,
}: {
  customer: ShopCustomerSummary;
  onOpen: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        className="flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-neutral-50"
      >
        <Avatar name={customer.name} pictureUrl={customer.line_picture_url} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate font-semibold text-neutral-900">
              {customer.name || "—"}
            </p>
            <NotifyBadge enabled={customer.line_bound} />
          </div>
          <p className="mt-0.5 truncate text-xs text-neutral-500">
            <span className="font-mono">{formatPhone(customer.phone)}</span>
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
            {customer.last_check_in ? fmtDate(customer.last_check_in) : "—"}
          </p>
          <p className="mt-0.5">
            累計：
            <span className="font-medium text-neutral-700">
              {fmtMoney(customer.total_spent)}
            </span>
          </p>
        </div>
        <ChevronRight className="ml-2 h-4 w-4 shrink-0 text-neutral-400" />
      </button>
    </li>
  );
}

function NotifyBadge({ enabled }: { enabled: boolean }) {
  if (enabled) {
    return (
      <span
        className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700"
        title={NOTIFY_HINT}
      >
        <BellRing className="h-3 w-3" />
        可圖文通知
      </span>
    );
  }
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full border border-neutral-200 bg-white px-2 py-0.5 text-[11px] font-medium text-neutral-500"
      title={NOTIFY_HINT}
    >
      未開通
    </span>
  );
}

function Avatar({
  name,
  pictureUrl,
  size = "md",
}: {
  name: string | null;
  pictureUrl: string | null;
  size?: "md" | "lg";
}) {
  const dim = size === "lg" ? "h-14 w-14 text-base" : "h-10 w-10 text-sm";
  if (pictureUrl) {
    return (
      <img
        src={pictureUrl}
        alt=""
        className={
          "shrink-0 rounded-full border border-neutral-200 object-cover " + dim
        }
      />
    );
  }
  const initial = (name ?? "").trim().charAt(0).toUpperCase() || "?";
  return (
    <div
      className={
        "flex shrink-0 items-center justify-center rounded-full border border-neutral-200 bg-neutral-50 font-semibold text-neutral-700 " +
        dim
      }
    >
      {initial === "?" ? <User className="h-5 w-5 text-neutral-400" /> : initial}
    </div>
  );
}

function CustomerDetailModal({
  customer,
  shopId,
  onClose,
  onOpenBooking,
}: {
  customer: ShopCustomerSummary | null;
  shopId: string;
  onClose: () => void;
  onOpenBooking: (id: string) => void;
}) {
  return (
    <Modal
      open={customer !== null}
      onClose={onClose}
      title="客戶詳情"
      size="lg"
    >
      {customer && (
        <CustomerDetailBody
          customer={customer}
          shopId={shopId}
          onOpenBooking={onOpenBooking}
        />
      )}
    </Modal>
  );
}

function CustomerDetailBody({
  customer,
  shopId,
  onOpenBooking,
}: {
  customer: ShopCustomerSummary;
  shopId: string;
  onOpenBooking: (id: string) => void;
}) {
  return (
    <div className="space-y-5">
      <header className="flex items-start gap-4">
        <Avatar
          name={customer.name}
          pictureUrl={customer.line_picture_url}
          size="lg"
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-lg font-semibold text-neutral-900">
              {customer.name || "—"}
            </h3>
            <NotifyBadge enabled={customer.line_bound} />
          </div>
          <a
            href={`tel:${customer.phone}`}
            className="mt-1 inline-block font-mono text-sm text-neutral-700 hover:underline"
          >
            {formatPhone(customer.phone)}
          </a>
          {customer.line_display_name && (
            <p className="mt-0.5 text-xs text-neutral-500">
              通知暱稱：{customer.line_display_name}
            </p>
          )}
        </div>
      </header>

      <div className="grid grid-cols-3 gap-3 border-y border-neutral-100 py-3 text-center">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wider text-neutral-400">
            訂單
          </p>
          <p className="mt-1 text-xl font-bold text-neutral-900">
            {customer.bookings_count}
          </p>
        </div>
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wider text-neutral-400">
            最近入住
          </p>
          <p className="mt-1 text-sm font-semibold text-neutral-900">
            {customer.last_check_in ? fmtDate(customer.last_check_in) : "—"}
          </p>
        </div>
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wider text-neutral-400">
            累計消費
          </p>
          <p className="mt-1 text-sm font-bold text-neutral-900">
            {fmtMoney(customer.total_spent)}
          </p>
        </div>
      </div>

      {!customer.line_bound && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-800">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            此客戶尚未開通圖文通知。請邀請客戶加入 {PLATFORM_NAME} 官方帳號並
            完成手機綁定，往後店家報平安與預約狀態變更才會自動推播到客戶 LINE。
          </span>
        </div>
      )}

      <section>
        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-neutral-500">
          歷史訂單
        </h4>
        <CustomerBookings
          shopId={shopId}
          phone={customer.phone}
          onOpen={onOpenBooking}
        />
      </section>
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
      // 先精確比對 guest_phone（多數新訂單存純數字），找不到再用末 7 碼
      // ilike 兜底（涵蓋舊資料含空白 / 連字號 / +886 等格式）。
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
      <div className="flex justify-center py-6">
        <Spinner size="sm" />
      </div>
    );
  }

  if (bookings.length === 0) {
    return (
      <p className="py-6 text-center text-xs text-neutral-400">
        沒有可顯示的訂單
      </p>
    );
  }

  return (
    <ul className="divide-y divide-neutral-100 overflow-hidden rounded-xl border border-neutral-200 bg-white">
      {bookings.map((b) => (
        <li key={b.id}>
          <button
            type="button"
            onClick={() => onOpen(b.id)}
            className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-neutral-50"
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
