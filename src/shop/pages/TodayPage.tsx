import { useCallback, useEffect, useState } from "react";
import {
  Bed,
  Calendar,
  Inbox,
  LogIn,
  LogOut,
  PawPrint,
  Phone,
  PlusCircle,
  RefreshCw,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { addDays, format } from "date-fns";
import { zhTW } from "date-fns/locale";
import toast from "react-hot-toast";
import { Spinner } from "@/components/Spinner";
import { StatusDot } from "@/components/StatusDot";
import { supabase, formatSupabaseError } from "@/lib/supabase";
import { useManagedOptions } from "@/lib/managedOptions";
import { fmtMoney, formatPhone } from "@/lib/format";
import type {
  Booking,
  BookingStatus,
  PetSize,
  PetType,
  Room,
} from "@/lib/types";
import { useShopAuth } from "@/shop/auth/useShopAuth";
import { PageHeader } from "@/shop/components/PageHeader";
import { BookingDetailModal } from "@/shop/components/BookingDetailModal";

interface BookingRow extends Booking {
  room: { id: string; name: string } | null;
}

interface Stats {
  pending: number;
  todayCheckIns: number;
  inHouse: number;
  todayCheckOuts: number;
}

const emptyStats: Stats = {
  pending: 0,
  todayCheckIns: 0,
  inHouse: 0,
  todayCheckOuts: 0,
};

/**
 * 店家「今日」頁 — Tablet-first POS UX：
 *   - 頂部：4 個 stat card 直接連結到「預約管理」對應 tab（待確認 / 今日入住 / 在住中 / 今日退房）
 *   - 主操作區左右兩欄：
 *       左（寬）：現場登記入住 walk-in form
 *       右（窄）：待您確認列表，點選即彈出 BookingDetailModal
 *   - tablet/desktop 採 100dvh 全螢幕，左右各自獨立滾動，符合 POS 雙手操作習慣
 */
export function ShopTodayPage() {
  const { shop } = useShopAuth();
  const [pending, setPending] = useState<BookingRow[]>([]);
  const [stats, setStats] = useState<Stats>(emptyStats);
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);
  const [openId, setOpenId] = useState<string | null>(null);
  const today = format(new Date(), "yyyy-MM-dd");

  const reload = useCallback(() => {
    setReloadKey((k) => k + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!shop) return;
      setLoading(true);
      const select = "*, room:rooms(id, name)";
      const [pendingRes, ciTodayRes, coTodayRes, inHouseRes] = await Promise.all(
        [
          supabase
            .from("bookings")
            .select(select)
            .eq("shop_id", shop.id)
            .eq("status", "pending")
            .order("check_in_date", { ascending: true }),
          supabase
            .from("bookings")
            .select("id", { count: "exact", head: true })
            .eq("shop_id", shop.id)
            .eq("check_in_date", today)
            .in("status", ["confirmed", "checked_in"]),
          supabase
            .from("bookings")
            .select("id", { count: "exact", head: true })
            .eq("shop_id", shop.id)
            .eq("check_out_date", today)
            .in("status", ["checked_in", "checked_out"]),
          supabase
            .from("bookings")
            .select("id", { count: "exact", head: true })
            .eq("shop_id", shop.id)
            .eq("status", "checked_in")
            .lte("check_in_date", today)
            .gt("check_out_date", today),
        ],
      );
      if (cancelled) return;
      setPending((pendingRes.data ?? []) as BookingRow[]);
      setStats({
        pending: (pendingRes.data ?? []).length,
        todayCheckIns: ciTodayRes.count ?? 0,
        todayCheckOuts: coTodayRes.count ?? 0,
        inHouse: inHouseRes.count ?? 0,
      });
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [shop, today, reloadKey]);

  return (
    <div className="flex flex-col bg-neutral-50/40 md:h-[100dvh]">
      {/* 頂部 — 標題 + stats，固定不滾動 */}
      <div className="border-b border-neutral-200 bg-white px-4 pb-4 pt-5 md:px-6">
        <PageHeader
          title={`嗨，${shop?.name ?? ""}`}
          description={format(new Date(), "yyyy 年 M 月 d 日 EEEE", {
            locale: zhTW,
          })}
          action={
            <button
              type="button"
              onClick={reload}
              className="btn-ghost text-sm"
              aria-label="重新整理"
            >
              <RefreshCw className="h-4 w-4" />
              重新整理
            </button>
          }
        />

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatLink
            icon={Inbox}
            label="待確認"
            value={stats.pending}
            to="/shop/bookings?tab=pending"
            highlight={stats.pending > 0}
          />
          <StatLink
            icon={LogIn}
            label="今日入住"
            value={stats.todayCheckIns}
            to="/shop/bookings?tab=today_check_in"
          />
          <StatLink
            icon={Bed}
            label="在住中"
            value={stats.inHouse}
            to="/shop/bookings?tab=checked_in"
          />
          <StatLink
            icon={LogOut}
            label="今日退房"
            value={stats.todayCheckOuts}
            to="/shop/bookings?tab=today_check_out"
          />
        </div>
      </div>

      {/* 主操作區 — 左寬（walk-in）右窄（待確認） */}
      <div className="flex-1 md:overflow-hidden">
        <div className="grid gap-4 p-4 md:h-full md:grid-cols-[1fr,minmax(0,360px)] md:gap-0 md:p-0">
          <aside className="md:overflow-y-auto md:border-r md:border-neutral-200 md:bg-white md:p-5">
            <WalkInPanel onCreated={reload} />
          </aside>

          <section className="md:overflow-y-auto md:bg-neutral-50/40 md:p-4">
            <PendingBlock
              items={pending}
              loading={loading}
              onSelect={setOpenId}
            />
          </section>
        </div>
      </div>

      <BookingDetailModal
        bookingId={openId}
        onClose={() => setOpenId(null)}
        onChanged={reload}
      />
    </div>
  );
}

function StatLink({
  icon: Icon,
  label,
  value,
  to,
  highlight,
}: {
  icon: typeof Inbox;
  label: string;
  value: number;
  to: string;
  highlight?: boolean;
}) {
  return (
    <Link
      to={to}
      className={
        "block rounded-card border bg-white p-4 transition-shadow hover:shadow-sm " +
        (highlight ? "border-amber-400" : "border-neutral-200")
      }
    >
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-neutral-500">{label}</p>
        <Icon className="h-4 w-4 text-neutral-400" strokeWidth={1.5} />
      </div>
      <p className="mt-2 text-3xl font-bold tracking-tight text-neutral-900">
        {value}
      </p>
    </Link>
  );
}

function PendingBlock({
  items,
  loading,
  onSelect,
}: {
  items: BookingRow[];
  loading: boolean;
  onSelect: (id: string) => void;
}) {
  return (
    <section className="overflow-hidden rounded-card border border-neutral-200 bg-white">
      <header className="flex items-center justify-between border-b border-neutral-100 px-4 py-3">
        <div className="flex items-center gap-2">
          <Inbox className="h-4 w-4 text-neutral-500" />
          <h2 className="text-sm font-semibold text-neutral-900">
            待您確認
          </h2>
        </div>
        <span className="text-xs text-neutral-500">{items.length} 筆</span>
      </header>
      {loading ? (
        <div className="flex justify-center py-8">
          <Spinner size="sm" />
        </div>
      ) : items.length === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-neutral-400">
          目前沒有待確認的預約
        </p>
      ) : (
        <ul className="divide-y divide-neutral-100">
          {items.map((b) => (
            <BookingListItem
              key={b.id}
              booking={b}
              onSelect={() => onSelect(b.id)}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

function BookingListItem({
  booking,
  onSelect,
}: {
  booking: BookingRow;
  onSelect: () => void;
}) {
  const status = booking.status as BookingStatus;
  const { petTypeLabel } = useManagedOptions();
  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-neutral-50"
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-neutral-200 text-neutral-700">
          <PawPrint className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate font-semibold text-neutral-900">
              {booking.guest_name}
            </p>
            <StatusDot status={status} className="shrink-0" />
          </div>
          <p className="mt-0.5 truncate text-xs text-neutral-500">
            {booking.pet_name} · {petTypeLabel(booking.pet_type)} ·{" "}
            {booking.room?.name ?? "—"}
            {booking.guest_phone && (
              <>
                {" "}
                ·{" "}
                <span className="font-mono">
                  {formatPhone(booking.guest_phone)}
                </span>
              </>
            )}
          </p>
          <p className="mt-0.5 text-xs text-neutral-500">
            {booking.check_in_date} → {booking.check_out_date}（
            {booking.nights} 晚）· {fmtMoney(booking.total_price)}
          </p>
        </div>
      </button>
    </li>
  );
}

interface WalkInForm {
  guest_name: string;
  guest_phone: string;
  guest_email: string;
  pet_name: string;
  pet_type: PetType;
  pet_size: PetSize;
  pet_breed: string;
  pet_note: string;
  room_id: string;
  check_in_date: string;
  check_out_date: string;
  guest_note: string;
}

function makeInitial(): WalkInForm {
  const today = format(new Date(), "yyyy-MM-dd");
  const tomorrow = format(addDays(new Date(), 1), "yyyy-MM-dd");
  return {
    guest_name: "",
    guest_phone: "",
    guest_email: "",
    pet_name: "",
    pet_type: "dog",
    pet_size: "small",
    pet_breed: "",
    pet_note: "",
    room_id: "",
    check_in_date: today,
    check_out_date: tomorrow,
    guest_note: "",
  };
}

function WalkInPanel({ onCreated }: { onCreated: () => void }) {
  const { shop } = useShopAuth();
  const navigate = useNavigate();
  const { petTypes, petSizes, petSizeLabel } = useManagedOptions();
  const activePetTypes = petTypes.filter((t) => t.is_active);
  const activePetSizes = petSizes.filter((s) => s.is_active);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [form, setForm] = useState<WalkInForm>(makeInitial);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!shop) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("rooms")
        .select("*")
        .eq("shop_id", shop.id)
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      if (cancelled) return;
      const list = (data ?? []) as Room[];
      setRooms(list);
      setForm((f) =>
        f.room_id || list.length === 0 ? f : { ...f, room_id: list[0].id },
      );
    })();
    return () => {
      cancelled = true;
    };
  }, [shop]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shop) return;
    if (!form.guest_name.trim() || !form.guest_phone.trim()) {
      toast.error("請填寫客戶姓名與手機");
      return;
    }
    if (!form.pet_name.trim()) {
      toast.error("請填寫寵物名字");
      return;
    }
    if (!form.room_id) {
      toast.error("請選擇房型");
      return;
    }
    if (form.check_out_date <= form.check_in_date) {
      toast.error("退房日期必須晚於入住日期");
      return;
    }
    setSubmitting(true);
    const { data, error } = await supabase.rpc("create_walkin_booking", {
      p_shop_id: shop.id,
      p_room_id: form.room_id,
      p_guest_name: form.guest_name.trim(),
      p_guest_phone: form.guest_phone.trim(),
      p_pet_name: form.pet_name.trim(),
      p_pet_type: form.pet_type,
      p_check_in_date: form.check_in_date,
      p_check_out_date: form.check_out_date,
      p_pet_size: form.pet_size,
      p_pet_breed: form.pet_breed.trim() || null,
      p_pet_note: form.pet_note.trim() || null,
      p_guest_email: form.guest_email.trim() || null,
      p_guest_note: form.guest_note.trim() || null,
    });
    setSubmitting(false);
    if (error) {
      toast.error(formatSupabaseError(error));
      return;
    }
    const result = (Array.isArray(data) ? data[0] : data) as
      | { booking_id: string; booking_code: string; warning: string | null }
      | undefined;
    if (result?.warning) toast(result.warning, { icon: "⚠️" });
    toast.success(`已登記入住（${result?.booking_code ?? ""}）`);
    setForm(makeInitial());
    onCreated();
  };

  return (
    <section className="overflow-hidden rounded-card border border-neutral-200 bg-white">
      <header className="flex items-center gap-2 border-b border-neutral-100 px-4 py-3">
        <PlusCircle className="h-4 w-4 text-neutral-500" />
        <h2 className="text-sm font-semibold text-neutral-900">
          現場登記入住
        </h2>
      </header>
      <form onSubmit={submit} className="grid grid-cols-1 gap-3 p-4 md:grid-cols-2">
        <fieldset className="space-y-2 md:col-span-2">
          <legend className="text-xs font-semibold text-neutral-500">
            客戶
          </legend>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
            <Field
              label="姓名"
              required
              value={form.guest_name}
              onChange={(v) => setForm({ ...form, guest_name: v })}
              placeholder="王小姐"
            />
            <Field
              label="手機"
              required
              type="tel"
              value={form.guest_phone}
              onChange={(v) => setForm({ ...form, guest_phone: v })}
              placeholder="0912 345 678"
              icon={Phone}
            />
            <Field
              label="Email（選填）"
              type="email"
              value={form.guest_email}
              onChange={(v) => setForm({ ...form, guest_email: v })}
            />
          </div>
        </fieldset>

        <fieldset className="space-y-2 md:col-span-2">
          <legend className="text-xs font-semibold text-neutral-500">
            寵物
          </legend>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-4">
            <Field
              label="名字"
              required
              value={form.pet_name}
              onChange={(v) => setForm({ ...form, pet_name: v })}
              placeholder="豆豆"
            />
            <SelectField
              label="類型"
              value={form.pet_type}
              onChange={(v) => setForm({ ...form, pet_type: v as PetType })}
              options={activePetTypes.map((t) => [t.key, t.label])}
            />
            <SelectField
              label="體型"
              value={form.pet_size}
              onChange={(v) => setForm({ ...form, pet_size: v as PetSize })}
              options={activePetSizes.map((s) => [
                s.key,
                petSizeLabel(form.pet_type, s.key),
              ])}
            />
            <Field
              label="品種（選填）"
              value={form.pet_breed}
              onChange={(v) => setForm({ ...form, pet_breed: v })}
            />
          </div>
        </fieldset>

        <fieldset className="space-y-2 md:col-span-2">
          <legend className="text-xs font-semibold text-neutral-500">
            房型 & 日期
          </legend>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
            <SelectField
              label="房型"
              value={form.room_id}
              onChange={(v) => setForm({ ...form, room_id: v })}
              options={rooms.map((r) => [
                r.id,
                `${r.name} · ${fmtMoney(r.price_per_night)}/晚`,
              ])}
              placeholder={rooms.length === 0 ? "尚未建立房型" : undefined}
            />
            <Field
              label="入住"
              type="date"
              value={form.check_in_date}
              onChange={(v) => setForm({ ...form, check_in_date: v })}
            />
            <Field
              label="退房"
              type="date"
              value={form.check_out_date}
              onChange={(v) => setForm({ ...form, check_out_date: v })}
            />
          </div>
        </fieldset>

        <div className="md:col-span-2">
          <Field
            label="備註（選填）"
            value={form.guest_note}
            onChange={(v) => setForm({ ...form, guest_note: v })}
            placeholder="特殊需求 / 飲食"
          />
        </div>

        <div className="md:col-span-2">
          {rooms.length === 0 ? (
            <button
              type="button"
              onClick={() => navigate("/shop/rooms")}
              className="btn-secondary w-full"
            >
              先到房型管理新增房型
            </button>
          ) : (
            <button
              type="submit"
              disabled={submitting}
              className="btn-primary w-full"
            >
              {submitting ? <Spinner size="sm" /> : <LogIn className="h-4 w-4" />}
              登記並入住
            </button>
          )}
          <p className="mt-2 text-center text-[11px] text-neutral-400">
            現場登記會直接以「入住中」狀態建立，跳過確認步驟
          </p>
        </div>
      </form>
    </section>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  required,
  icon: Icon,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
  icon?: typeof Calendar;
}) {
  return (
    <div>
      <label className="label flex items-center gap-1">
        {Icon && <Icon className="h-3 w-3" />}
        {label}
      </label>
      <input
        className="input"
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
      />
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: [string, string][];
  placeholder?: string;
}) {
  return (
    <div>
      <label className="label">{label}</label>
      <select
        className="input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map(([k, l]) => (
          <option key={k} value={k}>
            {l}
          </option>
        ))}
      </select>
    </div>
  );
}
