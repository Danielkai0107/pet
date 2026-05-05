import { useState } from "react";
import { Search } from "lucide-react";
import { Spinner } from "@/components/Spinner";
import { EmptyState } from "@/components/EmptyState";
import {
  emptyFilters,
  useShopSearch,
  type ShopSearchFilters,
} from "@/web/hooks/useShopSearch";
import { ShopSearchPanel } from "@/web/components/ShopSearchPanel";
import { ShopCard } from "@/web/components/ShopCard";

export function ShopsPage() {
  const [filters, setFilters] = useState<ShopSearchFilters>(emptyFilters);
  const { shops, loading, error } = useShopSearch(filters);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <header className="mb-5">
        <h1 className="text-2xl font-bold text-slate-900">找寵物旅館</h1>
        <p className="mt-1 text-sm text-slate-600">
          {loading
            ? "搜尋中…"
            : `共 ${shops.length} 家符合條件的合作旅館`}
        </p>
      </header>

      <ShopSearchPanel filters={filters} onChange={setFilters} />

      <div className="mt-6">
        {error ? (
          <div className="card">
            <EmptyState icon={Search} title="搜尋失敗" description={error} />
          </div>
        ) : loading ? (
          <div className="flex justify-center py-16">
            <Spinner />
          </div>
        ) : shops.length === 0 ? (
          <div className="card">
            <EmptyState
              icon={Search}
              title="沒有符合的旅館"
              description="試試放寬日期或城市條件。"
            />
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {shops.map((s) => (
              <ShopCard key={s.id} shop={s} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
