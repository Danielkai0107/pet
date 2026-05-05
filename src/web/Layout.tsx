import { Link, Outlet } from "react-router-dom";
import { PLATFORM_NAME } from "@/lib/constants";

/**
 * Airbnb 風 Web 公開頁外層：
 *   - 純白頂欄、底部細灰線；左側黑色 logo、右側「開始搜尋」膠囊。
 *   - 不再放重複意義的 tabs（房源 / 找旅館 → 都會走到 /shops），
 *     讓「開始搜尋」成為唯一進入點。
 *   - footer 簡化只留版權與必要連結（探索旅館 / 成為店家 / 店家後台）。
 */
export function WebLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <header className="sticky top-0 z-30 border-b border-neutral-200 bg-white">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
          <Link
            to="/"
            className="flex items-center gap-2 text-neutral-900"
            aria-label={PLATFORM_NAME}
          >
            <span className="text-lg font-bold tracking-tight">
              {PLATFORM_NAME}
            </span>
          </Link>

          <Link
            to="/shops"
            className="rounded-full border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-900 shadow-sm transition-shadow hover:shadow-md"
          >
            開始搜尋
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
