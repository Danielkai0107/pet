import { useState } from "react";
import { NavLink, Outlet, Link, useNavigate } from "react-router-dom";
import {
  Store,
  Users,
  Calendar,
  LogOut,
  Sliders,
  Menu,
  X,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { PLATFORM_NAME } from "@/lib/constants";
import { useAdminAuth } from "@/admin/auth/useAdminAuth";

/**
 * Super Admin 外層 — 與店家後台一致的 neutral 風 fixed sidebar：
 *   - lg+：左側 fixed sidebar，預設 80px icon-only，點擊頂部漢堡可展開為 256px
 *     overlay 在內容上方，不推擠 main 排版（main 永遠保留 80px padding-left）
 *   - 保留一個 brand-700 細字 "Super Admin" 標記，避免誤認為店家後台
 *   - <lg：直接顯示完整 sidebar 在頂部（簡單版，admin 主要在桌機操作）
 */
export function AdminLayout() {
  const { user, signOut } = useAdminAuth();
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);

  const handleLogout = async () => {
    await signOut();
    navigate("/admin/login");
  };

  return (
    <div className="min-h-screen bg-white">
      {expanded && (
        <button
          type="button"
          aria-label="收合側邊欄"
          onClick={() => setExpanded(false)}
          className="fixed inset-0 z-30 hidden bg-neutral-900/10 lg:block"
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 hidden flex-col border-r border-neutral-200 bg-white transition-[width] duration-200 ease-out lg:flex",
          expanded ? "w-64" : "w-20",
        )}
      >
        <div
          className={cn(
            "flex h-16 items-center gap-2 border-b border-neutral-200 px-3",
            !expanded && "justify-center px-0",
          )}
        >
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-neutral-700 transition-colors hover:bg-neutral-100"
            aria-label={expanded ? "收合側邊欄" : "展開側邊欄"}
          >
            {expanded ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </button>
          {expanded && (
            <Link
              to="/admin/shops"
              className="flex flex-col leading-tight text-neutral-900"
            >
              <span className="text-base font-bold tracking-tight">
                {PLATFORM_NAME}
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-brand-700">
                Super Admin
              </span>
            </Link>
          )}
        </div>

        {expanded && user?.email && (
          <div className="border-b border-neutral-100 px-4 py-3 text-xs text-neutral-500 truncate">
            {user.email}
          </div>
        )}

        <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
          <SideItem
            to="/admin/shops"
            icon={Store}
            label="商家管理"
            expanded={expanded}
          />
          <SideItem
            to="/admin/customers"
            icon={Users}
            label="消費者"
            expanded={expanded}
          />
          <SideItem
            to="/admin/bookings"
            icon={Calendar}
            label="全平台訂單"
            expanded={expanded}
          />
          <SideItem
            to="/admin/settings"
            icon={Sliders}
            label="站台設定"
            expanded={expanded}
          />
        </nav>

        <div className="border-t border-neutral-100 p-3">
          <button
            onClick={handleLogout}
            className={cn(
              "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-100 hover:text-neutral-900",
              !expanded && "justify-center px-0",
            )}
            title={expanded ? undefined : "登出"}
          >
            <LogOut className="h-4 w-4 shrink-0" />
            {expanded && <span>登出</span>}
          </button>
        </div>
      </aside>

      <main className="min-h-screen lg:pl-20">
        <Outlet />
      </main>
    </div>
  );
}

function SideItem({
  to,
  icon: Icon,
  label,
  expanded,
}: {
  to: string;
  icon: typeof Store;
  label: string;
  expanded: boolean;
}) {
  return (
    <NavLink
      to={to}
      title={expanded ? undefined : label}
      className={({ isActive }) =>
        cn(
          "relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
          !expanded && "justify-center px-0",
          isActive
            ? "bg-neutral-100 text-neutral-900"
            : "text-neutral-700 hover:bg-neutral-50 hover:text-neutral-900",
        )
      }
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <span
              aria-hidden="true"
              className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-neutral-900"
            />
          )}
          <Icon className="h-5 w-5 shrink-0" />
          {expanded && <span className="truncate">{label}</span>}
        </>
      )}
    </NavLink>
  );
}
