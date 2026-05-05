import { NavLink, Outlet, Link, useNavigate } from "react-router-dom";
import {
  Calendar,
  Home,
  Inbox,
  Bed,
  Settings,
  PawPrint,
  Mail,
  Users,
  CreditCard,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { PLATFORM_NAME } from "@/lib/constants";
import { useShopAuth } from "@/shop/auth/useShopAuth";

export function ShopLayout() {
  const { shop, signOut, user } = useShopAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/shop/login");
  };

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 lg:flex-row">
      <aside className="hidden border-r border-slate-200 bg-white lg:flex lg:w-64 lg:flex-col">
        <Link
          to="/shop/today"
          className="flex h-16 items-center gap-2 border-b border-slate-200 px-4 text-brand-700"
        >
          <PawPrint className="h-6 w-6" />
          <span className="text-base font-bold">{PLATFORM_NAME} 後台</span>
        </Link>

        <div className="border-b border-slate-100 px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
            目前商家
          </p>
          <p className="mt-1 truncate text-sm font-semibold text-slate-900">
            {shop?.name ?? "—"}
          </p>
          <p className="truncate text-xs text-slate-500">
            {user?.email ?? "—"}
          </p>
        </div>

        <nav className="flex-1 space-y-1 p-3">
          <SideItem to="/shop/today" icon={Home} label="今日" />
          <SideItem to="/shop/bookings" icon={Inbox} label="預約管理" />
          <SideItem to="/shop/rooms" icon={Bed} label="房型管理" />
          <SideItem to="/shop/inventory" icon={Calendar} label="庫存日曆" />
          <SideItem to="/shop/templates" icon={Mail} label="Email 模板" />
          <SideItem to="/shop/staff" icon={Users} label="員工" />
          <SideItem to="/shop/billing" icon={CreditCard} label="訂閱" />
          <SideItem to="/shop/settings" icon={Settings} label="商家設定" />
        </nav>

        <div className="border-t border-slate-100 p-3">
          <button onClick={handleSignOut} className="btn-ghost w-full justify-start">
            <LogOut className="h-4 w-4" />
            登出
          </button>
        </div>
      </aside>

      <main className="flex-1 pb-16 lg:pb-0">
        <Outlet />
      </main>

      {/* Bottom nav (mobile) */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 grid grid-cols-5 border-t border-slate-200 bg-white lg:hidden">
        <BottomItem to="/shop/today" icon={Home} label="今日" />
        <BottomItem to="/shop/bookings" icon={Inbox} label="預約" />
        <BottomItem to="/shop/rooms" icon={Bed} label="房型" />
        <BottomItem to="/shop/inventory" icon={Calendar} label="庫存" />
        <BottomItem to="/shop/settings" icon={Settings} label="設定" />
      </nav>
    </div>
  );
}

function SideItem({
  to,
  icon: Icon,
  label,
}: {
  to: string;
  icon: typeof Home;
  label: string;
}) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          "flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
          isActive
            ? "bg-brand-50 text-brand-700"
            : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
        )
      }
    >
      <Icon className="h-4 w-4" />
      {label}
    </NavLink>
  );
}

function BottomItem({
  to,
  icon: Icon,
  label,
}: {
  to: string;
  icon: typeof Home;
  label: string;
}) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          "flex flex-col items-center justify-center gap-0.5 py-2 text-xs",
          isActive ? "text-brand-700" : "text-slate-500",
        )
      }
    >
      <Icon className="h-5 w-5" />
      <span>{label}</span>
    </NavLink>
  );
}
