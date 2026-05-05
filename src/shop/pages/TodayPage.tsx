import { useEffect, useState } from "react";
import { Inbox, Bed, Calendar, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { zhTW } from "date-fns/locale";
import { Spinner } from "@/components/Spinner";
import { supabase } from "@/lib/supabase";
import { useShopAuth } from "@/shop/auth/useShopAuth";
import { PageHeader } from "@/shop/components/PageHeader";

interface Stats {
  pending: number;
  todayCheckIns: number;
  todayCheckOuts: number;
}

export function ShopTodayPage() {
  const { shop } = useShopAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const today = format(new Date(), "yyyy-MM-dd");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!shop) return;
      const [pendingRes, ciRes, coRes] = await Promise.all([
        supabase
          .from("bookings")
          .select("id", { count: "exact", head: true })
          .eq("shop_id", shop.id)
          .eq("status", "pending"),
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
          .in("status", ["confirmed", "checked_in", "checked_out"]),
      ]);
      if (cancelled) return;
      setStats({
        pending: pendingRes.count ?? 0,
        todayCheckIns: ciRes.count ?? 0,
        todayCheckOuts: coRes.count ?? 0,
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [shop, today]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <PageHeader
        title={`嗨，${shop?.name ?? ""}`}
        description={format(new Date(), "yyyy 年 M 月 d 日 EEEE", { locale: zhTW })}
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          icon={Inbox}
          label="待確認預約"
          value={stats?.pending}
          highlight={(stats?.pending ?? 0) > 0}
          to="/shop/bookings"
        />
        <StatCard
          icon={Bed}
          label="今日入住"
          value={stats?.todayCheckIns}
          to="/shop/bookings"
        />
        <StatCard
          icon={Calendar}
          label="今日退房"
          value={stats?.todayCheckOuts}
          to="/shop/bookings"
        />
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <QuickAction
          to="/shop/rooms"
          title="房型管理"
          desc="新增 / 編輯房型，設定價格與可收的寵物"
          icon={Bed}
        />
        <QuickAction
          to="/shop/inventory"
          title="庫存日曆"
          desc="即時呈現每日剩餘房數，可手動覆寫"
          icon={Calendar}
        />
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  to,
  highlight,
}: {
  icon: typeof Inbox;
  label: string;
  value: number | undefined;
  to: string;
  highlight?: boolean;
}) {
  return (
    <Link
      to={to}
      className={
        "card group flex flex-col p-5 transition-all hover:shadow-md " +
        (highlight ? "ring-2 ring-amber-300" : "")
      }
    >
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-600">{label}</p>
        <Icon className="h-5 w-5 text-slate-400" />
      </div>
      <p className="mt-2 text-3xl font-bold text-slate-900">
        {value === undefined ? <Spinner size="sm" /> : value}
      </p>
    </Link>
  );
}

function QuickAction({
  to,
  title,
  desc,
  icon: Icon,
}: {
  to: string;
  title: string;
  desc: string;
  icon: typeof Inbox;
}) {
  return (
    <Link
      to={to}
      className="card flex items-center justify-between gap-3 p-5 transition-all hover:shadow-md"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="font-semibold text-slate-900">{title}</p>
          <p className="text-xs text-slate-500">{desc}</p>
        </div>
      </div>
      <ArrowRight className="h-4 w-4 text-slate-400" />
    </Link>
  );
}
