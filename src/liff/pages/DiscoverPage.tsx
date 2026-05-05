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
import { LiffGate } from "@/liff/components/LiffGate";

function DiscoverContent() {
  const [filters, setFilters] = useState<ShopSearchFilters>(emptyFilters);
  const { shops, loading, error } = useShopSearch(filters);

  return (
    <div className="px-4 py-5">
      <h1 className="text-xl font-bold text-slate-900">找寵物旅館</h1>
      <p className="mt-1 text-sm text-slate-500">
        搜尋並預約合作旅館，預約後會自動歸戶到此 LINE 帳號。
      </p>

      <div className="mt-4">
        <ShopSearchPanel filters={filters} onChange={setFilters} />
      </div>

      <div className="mt-5">
        {error ? (
          <div className="card">
            <EmptyState icon={Search} title="搜尋失敗" description={error} />
          </div>
        ) : loading ? (
          <div className="flex justify-center py-12">
            <Spinner />
          </div>
        ) : shops.length === 0 ? (
          <div className="card">
            <EmptyState icon={Search} title="沒有符合的旅館" />
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {shops.map((s) => (
              <ShopCard key={s.id} shop={s} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function LiffDiscoverPage() {
  return (
    <LiffGate allowAnonymous>
      <DiscoverContent />
    </LiffGate>
  );
}
