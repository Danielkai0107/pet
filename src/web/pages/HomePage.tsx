import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Spinner } from "@/components/Spinner";
import { PLATFORM_NAME } from "@/lib/constants";
import {
  emptyFilters,
  filtersToSearchParams,
  useShopSearch,
} from "@/web/hooks/useShopSearch";
import { ShopSearchPanel } from "@/web/components/ShopSearchPanel";
import { ShopCard } from "@/web/components/ShopCard";

/**
 * Airbnb 風首頁：
 *   - 沒有 hero 漸層；只有頂部副標 + 搜尋膠囊。
 *   - 第一排：橫向滾動的「熱門精選」（mobile 重點）
 *   - 第二排：grid 列出所有合作旅館
 *   - 底部簡單兩行字 + 連結，沒有大色塊三大特色
 */
export function HomePage() {
  const [filters, setFilters] = useState(emptyFilters);
  const { shops, loading } = useShopSearch(filters);
  const featured = shops.slice(0, 8);
  const navigate = useNavigate();

  const handleSearchSubmit = () => {
    const sp = filtersToSearchParams(filters);
    const qs = sp.toString();
    navigate(qs ? `/shops?${qs}` : "/shops");
  };

  return (
    <div className="bg-white">
      <section className="mx-auto max-w-6xl px-4 pt-6 sm:pt-10">
        <h1 className="text-2xl font-bold tracking-tight text-neutral-900 sm:text-3xl">
          為毛孩，找到下一個家
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          整合全台合作寵物旅館，加入 LINE 即可追蹤所有訂單。
        </p>

        <div className="mt-5 sm:mt-6">
          <ShopSearchPanel
            filters={filters}
            onChange={setFilters}
            onSubmit={handleSearchSubmit}
          />
        </div>
      </section>

      {/* 熱門精選 — 橫向滾動（mobile 主視覺） */}
      <section className="mx-auto max-w-6xl px-4 pt-10 sm:pt-12">
        <div className="mb-3 flex items-end justify-between">
          <h2 className="text-lg font-semibold text-neutral-900">熱門精選</h2>
          <Link
            to="/shops"
            className="inline-flex items-center gap-1 text-sm font-medium text-neutral-700 hover:underline"
          >
            看全部
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        {loading ? (
          <div className="flex justify-center py-10">
            <Spinner />
          </div>
        ) : featured.length === 0 ? (
          <div className="rounded-card border border-neutral-200 p-10 text-center text-sm text-neutral-500">
            還沒有上架商家，敬請期待。
          </div>
        ) : (
          <div className="-mx-4 flex gap-4 overflow-x-auto px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden snap-x snap-mandatory sm:mx-0 sm:grid sm:grid-cols-2 sm:gap-5 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-4">
            {featured.map((s) => (
              <div
                key={s.id}
                className="w-64 shrink-0 snap-start sm:w-auto"
              >
                <ShopCard shop={s} />
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 全部合作旅館 grid — desktop 4 欄 / tablet 2 欄 / mobile 1.2 欄 */}
      <section className="mx-auto max-w-6xl px-4 pt-12">
        <h2 className="mb-4 text-lg font-semibold text-neutral-900">合作寵物旅館</h2>
        {loading ? (
          <div className="flex justify-center py-10">
            <Spinner />
          </div>
        ) : shops.length === 0 ? (
          <div className="rounded-card border border-neutral-200 p-10 text-center text-sm text-neutral-500">
            還沒有上架商家，敬請期待。
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {shops.map((s) => (
              <ShopCard key={s.id} shop={s} />
            ))}
          </div>
        )}
      </section>

      {/* 底部簡介 — 純文字版「為什麼選我們」，無色塊 */}
      <section className="mx-auto mt-16 max-w-3xl px-4 pb-16 text-center">
        <h2 className="text-xl font-semibold text-neutral-900">
          為什麼選擇 {PLATFORM_NAME}
        </h2>
        <p className="mx-auto mt-2 max-w-xl text-sm text-neutral-600">
          每家合作店家都通過審核才能上架；3 步驟完成預約；加入官方 LINE
          即可一個帳號管理所有訂單與歷史紀錄。
        </p>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
          <Link to="/shops" className="btn-primary">
            開始找寵物旅館
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            to="/shop/onboarding"
            className="text-sm font-medium text-neutral-700 hover:underline"
          >
            我是寵物旅館業者，想加入合作
          </Link>
        </div>
      </section>
    </div>
  );
}
