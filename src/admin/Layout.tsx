import { NavLink, Outlet, Link, useNavigate } from "react-router-dom";
import { Shield, Store, Users, Calendar, LogOut } from "lucide-react";
import { cn } from "@/lib/cn";
import { PLATFORM_NAME } from "@/lib/constants";
import { useAdminAuth } from "@/admin/auth/useAdminAuth";

export function AdminLayout() {
  const { user, signOut } = useAdminAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    navigate("/admin/login");
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      <aside className="hidden w-60 flex-col border-r border-slate-200 bg-white lg:flex">
        <Link
          to="/admin/shops"
          className="flex h-16 items-center gap-2 border-b border-slate-200 px-4 text-rose-700"
        >
          <Shield className="h-6 w-6" />
          <span className="text-base font-bold">{PLATFORM_NAME} Super</span>
        </Link>
        <div className="border-b border-slate-100 px-4 py-3 text-xs text-slate-500">
          {user?.email}
        </div>
        <nav className="flex-1 space-y-1 p-3">
          <SideItem to="/admin/shops" icon={Store} label="商家管理" />
          <SideItem to="/admin/customers" icon={Users} label="消費者" />
          <SideItem to="/admin/bookings" icon={Calendar} label="全平台訂單" />
        </nav>
        <div className="border-t border-slate-100 p-3">
          <button onClick={handleLogout} className="btn-ghost w-full justify-start">
            <LogOut className="h-4 w-4" />
            登出
          </button>
        </div>
      </aside>

      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
}

function SideItem({
  to,
  icon: Icon,
  label,
}: {
  to: string;
  icon: typeof Store;
  label: string;
}) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          "flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
          isActive
            ? "bg-rose-50 text-rose-700"
            : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
        )
      }
    >
      <Icon className="h-4 w-4" />
      {label}
    </NavLink>
  );
}
