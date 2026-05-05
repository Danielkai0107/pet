import { Link, Outlet } from "react-router-dom";
import { PLATFORM_NAME } from "@/lib/constants";

/**
 * Airbnb 風 Web 公開頁外層：
 *   - 純白頂欄、底部細灰線；只放左側黑色 logo（點擊回首頁）。
 *   - 不放任何重複的入口按鈕；返回搜尋的需求由各頁面自己處理
 *     （例如 ShopDetailPage 上方的「回首頁」outline 按鈕）。
 *   - footer 簡化只留版權與必要連結（探索旅館 / 成為店家 / 店家後台）。
 */
export function WebLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <header className="sticky top-0 z-30 border-b border-neutral-200 bg-white">
        <div className="mx-auto flex h-16 max-w-6xl items-center px-4">
          <Link
            to="/"
            className="flex items-center gap-2 text-neutral-900"
            aria-label={PLATFORM_NAME}
          >
            <span className="text-lg font-bold tracking-tight">
              {PLATFORM_NAME}
            </span>
          </Link>
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t border-neutral-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-6 text-xs text-neutral-500 sm:flex-row">
          <p>
            © {new Date().getFullYear()} {PLATFORM_NAME} · 為毛孩找到合適的住宿
          </p>
          <div className="flex flex-wrap items-center gap-4 text-neutral-500">
            <Link to="/shops" className="hover:text-neutral-900">
              探索旅館
            </Link>
            <Link to="/shop/onboarding" className="hover:text-neutral-900">
              成為店家
            </Link>
            <Link to="/shop/login" className="hover:text-neutral-900">
              店家後台
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
