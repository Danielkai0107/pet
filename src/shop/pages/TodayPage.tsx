import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bed,
  Calendar,
  ChevronRight,
  Inbox,
  LogIn,
  LogOut,
  PawPrint,
  Phone,
  PlusCircle,
  RefreshCw,
} from "lucide-react";
import { Link } from "react-router-dom";
import { addDays, format } from "date-fns";
import { zhTW } from "date-fns/locale";
import toast from "react-hot-toast";
import { Spinner } from "@/components/Spinner";
import { Badge } from "@/components/Badge";
import { supabase, formatSupabaseError } from "@/lib/supabase";
import {
  BOOKING_STATUS_COLOR,
  BOOKING_STATUS_LABEL,
  PET_TYPE_LABEL,
} from "@/lib/constants";
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

interface BookingRow extends Booking {
  room: { id: string; name: string } | null;
}

interface Lists {
  pending: BookingRow[];
  todayCheckIns: BookingRow[];
  todayInHouse: BookingRow[]; // currently checked in (not yet out)
  todayCheckOuts: BookingRow[];
}

const emptyLists: Lists = {
  pending: [],
  todayCheckIns: [],
  todayInHouse: [],
  todayCheckOuts: [],
};

export function ShopTodayPage() {
  const { shop } = useShopAuth();
  const [lists, setLists] = useState<Lists>(emptyLists);
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);
  const today = format(new Date(), "yyyy-MM-dd");

  const reload = useCallback(() => {
    setReloadKey((k) => k + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!shop) return;
      setLoading(true);
      const select =
        "*, room:rooms(id, name)";
      const [pendingRes, ciTodayRes, coTodayRes, inHouseRes] = await Promise.all([
        supabase
          .from("bookings")
          .select(select)
          .eq("shop_id", shop.id)
          .eq("status", "pending")
          .order("check_in_date", { ascending: true })
          .limit(20),
        supabase
          .from("bookings")
          .select(select)
          .eq("shop_id", shop.id)
          .eq("check_in_date", today)
          .in("status", ["confirmed", "checked_in"])
          .order("created_at", { ascending: true }),
        supabase
          .from("bookings")
          .select(select)
          .eq("shop_id", shop.id)
          .eq("check_out_date", today)
          .in("status", ["checked_in", "checked_out"])
          .order("checked_in_at", { ascending: true }),
        supabase
          .from("bookings")
          .select(select)
          .eq("shop_id", shop.id)
          .eq("status", "checked_in")
          .lte("check_in_date", today)
          .gt("check_out_date", today)
          .order("check_out_date", { ascending: true }),
      ]);
      if (cancelled) return;
      setLists({
        pending: (pendingRes.data ?? []) as BookingRow[],
        todayCheckIns: (ciTodayRes.data ?? []) as BookingRow[],
        todayCheckOuts: (coTodayRes.data ?? []) as BookingRow[],
        todayInHouse: (inHouseRes.data ?? []) as BookingRow[],
      });
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [shop, today, reloadKey]);

  const stats = useMemo(
    () => ({
      pending: lists.pending.length,
      todayCheckIns: lists.todayCheckIns.length,
      todayCheckOuts: lists.todayCheckOuts.length,
      inHouse: lists.todayInHouse.length,
    }),
    [lists],
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
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
        <StatCard
          icon={Inbox}
          label="待確認"
          value={stats.pending}
          highlight={stats.pending > 0}
          color="bg-amber-50 text-amber-700"
        />
        <StatCard
          icon={LogIn}
          label="今日入住"
          value={stats.todayCheckIns}
          color="bg-emerald-50 text-emerald-700"
        />
        <StatCard
          icon={Bed}
          label="在住中"
          value={stats.inHouse}
          color="bg-blue-50 text-blue-700"
        />
        <StatCard
          icon={LogOut}
          label="今日退房"
          value={stats.todayCheckOuts}
          color="bg-slate-100 text-slate-700"
        />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,360px),1fr]">
        <WalkInPanel onCreated={reload} />

        <div className="space-y-4">
          <ListBlock
            title="今日入住"
            empty="今天沒有預約入住"
            icon={LogIn}
            items={lists.todayCheckIns}
            loading={loading}
          />
          <ListBlock
            title="在住中"
            empty="目前沒有客人在住"
            icon={Bed}
            items={lists.todayInHouse}
            loading={loading}
          />
          <ListBlock
            title="今日退房"
            empty="今天沒有預約退房"
            icon={LogOut}
            items={lists.todayCheckOuts}
            loading={loading}
          />
          {stats.pending > 0 && (
            <ListBlock
              title="待您確認"
              empty=""
              icon={Inbox}
              items={lists.pending}
              loading={loading}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  highlight,
  color,
}: {
  icon: typeof Inbox;
  label: string;
  value: number;
  highlight?: boolean;
  color: string;
}) {
  return (
    <div
      className={
        "card flex items-center gap-3 p-3 " +
        (highlight ? "ring-2 ring-amber-300" : "")
      }
    >
      <div
        className={`flex h-9 w-9 items-center justify-center rounded-xl ${color}`}
      >
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-slate-500">{label}</p>
        <p className="text-xl font-bold text-slate-900">{value}</p>
      </div>
    </div>
  );
}

function ListBlock({
  title,
  empty,
  icon: Icon,
  items,
  loading,
}: {
  title: string;
  empty: string;
  icon: typeof Inbox;
  items: BookingRow[];
  loading: boolean;
}) {
  return (
    <section className="card overflow-hidden">
      <header className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-slate-500" />
          <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
        </div>
        <span className="text-xs text-slate-500">{items.length} 筆</span>
      </header>
      {loading ? (
        <div className="flex justify-center py-6">
          <Spinner size="sm" />
        </div>
      ) : items.length === 0 ? (
        <p className="px-4 py-6 text-center text-sm text-slate-400">{empty}</p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {items.map((b) => (
            <BookingListItem key={b.id} booking={b} />
          ))}
        </ul>
      )}
    </section>
  );
}

function BookingListItem({ booking }: { booking: BookingRow }) {
  const status = booking.status as BookingStatus;
  return (
    <li>
      <Link
        to={`/shop/bookings/${booking.id}`}
        className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50"
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
          <PawPrint className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="truncate font-semibold text-slate-900">
              {booking.guest_name}
            </p>
            <Badge className={BOOKING_STATUS_COLOR[status] + " shrink-0"}>
              {BOOKING_STATUS_LABEL[status]}
            </Badge>
          </div>
          <p className="mt-0.5 truncate text-xs text-slate-500">
            {booking.pet_name} · {PET_TYPE_LABEL[booking.pet_type]} ·{" "}
            {booking.room?.name ?? "—"}
            {booking.guest_phone && (
              <>
                {" "}
                · <span className="font-mono">{formatPhone(booking.guest_phone)}</span>
              </>
            )}
          </p>
          <p className="mt-0.5 text-xs text-slate-500">
            {booking.check_in_date} → {booking.check_out_date}（
            {booking.nights} 晚）· {fmtMoney(booking.total_price)}
          </p>
        </div>
        <ChevronRight className="h-4 w-4 shrink-0 text-slate-300" />
      </Link>
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
    <section className="card sticky top-4 self-start overflow-hidden">
      <header className="flex items-center gap-2 border-b border-slate-100 bg-brand-50/40 px-4 py-3">
        <PlusCircle className="h-4 w-4 text-brand-700" />
        <h2 className="text-sm font-semibold text-slate-900">現場登記入住</h2>
      </header>
      <form onSubmit={submit} className="space-y-3 p-4">
        <fieldset className="space-y-2">
          <legend className="text-xs font-semibold text-slate-500">
            客戶
          </legend>
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
        </fieldset>

        <fieldset className="space-y-2">
          <legend className="text-xs font-semibold text-slate-500">
            寵物
          </legend>
          <Field
            label="名字"
            required
            value={form.pet_name}
            onChange={(v) => setForm({ ...form, pet_name: v })}
            placeholder="豆豆"
          />
          <div className="grid grid-cols-2 gap-2">
            <SelectField
              label="類型"
              value={form.pet_type}
              onChange={(v) =>
                setForm({ ...form, pet_type: v as PetType })
              }
              options={Object.entries(PET_TYPE_LABEL).map(([k, v]) => [k, v])}
            />
            <SelectField
              label="體型"
              value={form.pet_size}
              onChange={(v) =>
                setForm({ ...form, pet_size: v as PetSize })
              }
              options={[
                ["small", "小型"],
                ["medium", "中型"],
                ["large", "大型"],
                ["xlarge", "超大型"],
              ]}
            />
          </div>
          <Field
            label="品種（選填）"
            value={form.pet_breed}
            onChange={(v) => setForm({ ...form, pet_breed: v })}
          />
        </fieldset>

        <fieldset className="space-y-2">
          <legend className="text-xs font-semibold text-slate-500">
            房型 & 日期
          </legend>
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
          <div className="grid grid-cols-2 gap-2">
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

        <Field
          label="備註（選填）"
          value={form.guest_note}
          onChange={(v) => setForm({ ...form, guest_note: v })}
          placeholder="特殊需求 / 飲食"
        />

        {rooms.length === 0 ? (
          <Link to="/shop/rooms" className="btn-secondary w-full">
            先到房型管理新增房型
          </Link>
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

        <p className="text-center text-[11px] text-slate-400">
          現場登記會直接以「入住中」狀態建立，跳過確認步驟
        </p>
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
