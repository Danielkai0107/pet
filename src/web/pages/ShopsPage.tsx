import { useMemo, useRef, useState } from "react";
import { Search, SlidersHorizontal } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { Spinner } from "@/components/Spinner";
import { EmptyState } from "@/components/EmptyState";
import {
  filtersFromSearchParams,
  filtersToSearchParams,
  useShopSearch,
  type ShopSearchFilters,
} from "@/web/hooks/useShopSearch";
import { ShopSearchPanel } from "@/web/components/ShopSearchPanel";
import { ShopCard } from "@/web/components/ShopCard";
import type { ShopSearchResult } from "@/lib/types";
import { cn } from "@/lib/cn";

type SortKey = "recommended" | "price_asc" | "price_desc";

export function ShopsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [filters, setFilters] = useState<ShopSearchFilters>(() =>
    filtersFromSearchParams(searchParams),
  );
  const { shops, loading, error } = useShopSearch(filters);
  const [sort, setSort] = useState<SortKey>("recommended");
  const resultsRef = useRef<HTMLDivElement | null>(null);

  const handleFiltersChange = (next: ShopSearchFilters) => {
    setFilters(next);
    setSearchParams(filtersToSearchParams(next), { replace: true });
  };

  const handleSearchSubmit = () => {
    resultsRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  const sortedShops = useMemo(() => {
    const arr = [...shops];
    if (sort === "price_asc") {
      arr.sort(
        (a, b) =>
          (a.min_price ?? Number.MAX_SAFE_INTEGER) -
          (b.min_price ?? Number.MAX_SAFE_INTEGER),
      );
    } else if (sort === "price_desc") {
      arr.sort((a, b) => (b.min_price ?? 0) - (a.min_price ?? 0));
    }
    return arr;
  }, [shops, sort]);

  return (
    <div className="bg-white">
      <div className="border-b border-neutral-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 pb-5 pt-6">
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900">
            找寵物旅館
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            {loading
              ? "搜尋中…"
              : `共 ${shops.length} 家符合條件的合作旅館`}
          </p>
          <div className="mt-4">
            <ShopSearchPanel
              filters={filters}
              onChange={handleFiltersChange}
              onSubmit={handleSearchSubmit}
            />
          </div>
        </div>
      </div>

      <div ref={resultsRef} className="mx-auto max-w-6xl px-4 py-6">
        <div className="mb-4 flex items-center justify-between text-sm">
          <span className="inline-flex items-center gap-1.5 text-neutral-600">
            <SlidersHorizontal className="h-4 w-4" />
            {loading ? "—" : `${sortedShops.length} 家旅館`}
          </span>
          <div className="flex items-center gap-2 text-neutral-600">
            <span className="text-xs">排序</span>
            <SortChip
              active={sort === "recommended"}
              onClick={() => setSort("recommended")}
            >
              推薦
            </SortChip>
            <SortChip
              active={sort === "price_asc"}
              onClick={() => setSort("price_asc")}
            >
              低價優先
            </SortChip>
            <SortChip
              active={sort === "price_desc"}
              onClick={() => setSort("price_desc")}
            >
              高價優先
            </SortChip>
          </div>
        </div>

        {error ? (
          <div className="rounded-card border border-neutral-200">
            <EmptyState icon={Search} title="搜尋失敗" description={error} />
          </div>
        ) : loading ? (
          <div className="flex justify-center py-16">
            <Spinner />
          </div>
        ) : sortedShops.length === 0 ? (
          <div className="rounded-card border border-neutral-200">
            <EmptyState
              icon={Search}
              title="沒有符合的旅館"
              description="試試放寬日期或城市條件。"
            />
          </div>
        ) : (
          <ShopGrid shops={sortedShops} />
        )}
      </div>
    </div>
  );
}

function ShopGrid({ shops }: { shops: ShopSearchResult[] }) {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {shops.map((s) => (
        <ShopCard key={s.id} shop={s} />
      ))}
    </div>
  );
}

function SortChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
        active
          ? "border-neutral-900 bg-neutral-900 text-white"
          : "border-neutral-200 bg-white text-neutral-700 hover:border-neutral-300 hover:bg-neutral-50",
      )}
    >
      {children}
    </button>
  );
}
