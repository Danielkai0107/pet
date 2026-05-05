import { useState } from "react";
import { NavLink, Outlet, Link, useNavigate } from "react-router-dom";
import {
  Calendar,
  Home,
  Inbox,
  Bed,
  Settings,
  Mail,
  Users,
  CreditCard,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { PLATFORM_NAME } from "@/lib/constants";
import { useShopAuth } from "@/shop/auth/useShopAuth";

/**
 * 店家後台外層 — Tablet-first POS UX：
 *   - desktop / tablet (≥md)：左側 sidebar 為 fixed position，預設 80px icon-only
 *     收合，點擊頂部漢堡可展開為 256px。展開時 overlay 在內容之上，不推擠
 *     主畫面排版（main 永遠保留 80px padding-left 給 icon strip）。
 *   - mobile：底部 5 顆 tab bar；觸控目標 ≥56px、字稍大。
 *   - 所有 nav item active 樣式不再用 brand 色塊，改為左側 2px 直線
 *     + neutral-100 灰底 + neutral-900 黑字，更貼近 Airbnb / POS 視覺。
 */
export function ShopLayout() {
  const { shop, signOut, user } = useShopAuth();
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate("/shop/login");
  };

  return (
    <div className="min-h-screen bg-white">
      {/* 點擊背景遮罩可關閉展開狀態（mobile 用 bottom nav，這層只在 md+ 顯示） */}
      {expanded && (
        <button
          type="button"
          aria-label="收合側邊欄"
          onClick={() => setExpanded(false)}
          className="fixed inset-0 z-30 hidden bg-neutral-900/10 md:block"
        />
      )}

      {/* 左側 sidebar — fixed，永遠固定不滾動 */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 hidden flex-col border-r border-neutral-200 bg-white transition-[width] duration-200 ease-out md:flex",
          expanded ? "w-64" : "w-20",
        )}
      >
        {/* Logo + toggle — 收合時 hamburger 置中對齊下方 nav 圖示 */}
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
              to="/shop/today"
              className="flex flex-col leading-tight text-neutral-900"
            >
              <span className="text-base font-bold tracking-tight">
                {PLATFORM_NAME}
              </span>
              <span className="text-[11px] font-medium text-neutral-500">
                後台
              </span>
            </Link>
          )}
        </div>

        {/* 商家資訊 — 只在展開時顯示，避免收合時擠成兩行 */}
        {expanded && (
          <div className="border-b border-neutral-100 px-5 py-4">
            <p className="text-[11px] font-medium uppercase tracking-wider text-neutral-400">
              目前商家
            </p>
            <p className="mt-1 truncate text-sm font-semibold text-neutral-900">
              {shop?.name ?? "—"}
            </p>
            <p className="truncate text-xs text-neutral-500">
              {user?.email ?? "—"}
            </p>
          </div>
        )}

        <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
          <SideItem
            to="/shop/today"
            icon={Home}
            label="今日"
            expanded={expanded}
          />
          <SideItem
            to="/shop/bookings"
            icon={Inbox}
            label="預約管理"
            expanded={expanded}
          />
          <SideItem
            to="/shop/rooms"
            icon={Bed}
            label="房型管理"
            expanded={expanded}
          />
          <SideItem
            to="/shop/inventory"
            icon={Calendar}
            label="庫存日曆"
            expanded={expanded}
          />
          <SideItem
            to="/shop/templates"
            icon={Mail}
            label="Email 模板"
            expanded={expanded}
          />
          <SideItem
            to="/shop/staff"
            icon={Users}
            label="員工"
            expanded={expanded}
          />
          <SideItem
            to="/shop/billing"
            icon={CreditCard}
            label="訂閱"
            expanded={expanded}
          />
          <SideItem
            to="/shop/settings"
            icon={Settings}
            label="商家設定"
            expanded={expanded}
          />
        </nav>

        <div className="border-t border-neutral-100 p-3">
          <button
            onClick={handleSignOut}
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

      {/* main：永遠預留 80px 給 icon strip，展開時不會推擠 */}
      <main className="min-h-screen pb-20 md:pb-0 md:pl-20">
        <Outlet />
      </main>

      {/* 底部 tab bar：mobile only — 觸控目標放大、字級略大（POS 風） */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 grid grid-cols-5 border-t border-neutral-200 bg-white pb-[env(safe-area-inset-bottom)] md:hidden">
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
  expanded,
}: {
  to: string;
  icon: typeof Home;
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
          "flex flex-col items-center justify-center gap-0.5 py-2.5 text-[11px] font-medium",
          isActive ? "text-neutral-900" : "text-neutral-500",
        )
      }
    >
      <Icon className="h-5 w-5" />
      <span>{label}</span>
    </NavLink>
  );
}
