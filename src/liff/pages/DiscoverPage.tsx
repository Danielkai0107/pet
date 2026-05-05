import { useState } from "react";
import { Calendar, ChevronDown, MapPin, PawPrint, Search, Wallet, X } from "lucide-react";
import { Spinner } from "@/components/Spinner";
import { EmptyState } from "@/components/EmptyState";
import { LiffGate } from "@/liff/components/LiffGate";
import {
  emptyFilters,
  useShopSearch,
  type ShopSearchFilters,
} from "@/web/hooks/useShopSearch";
import { ShopCard } from "@/web/components/ShopCard";
import { useManagedOptions } from "@/lib/managedOptions";
import type { PetType } from "@/lib/types";
import { cn } from "@/lib/cn";

/**
 * LIFF 找寵物旅館頁 — Mobile-first 簡化搜尋：
 *   - 直接以搜尋元件為頁首，不重複呈現標題副標（LIFF Tab 已標示頁面為「找飯店」）
 *   - 主要篩選列只露兩個：城市 + 寵物類型（最常用）
 *   - 「進階篩選」可摺疊展開日期 / 預算 / 清除
 *   - 結果單欄列表（mobile 主視覺）
 */
function DiscoverContent() {
  const [filters, setFilters] = useState<ShopSearchFilters>(emptyFilters);
  const { shops, loading, error } = useShopSearch(filters);
  const [advanced, setAdvanced] = useState(false);
  const { petTypes, cities } = useManagedOptions();
  const activePetTypes = petTypes.filter((t) => t.is_active);
  const activeCities = cities.filter((c) => c.is_active);

  const hasAdvanced =
    filters.checkIn || filters.checkOut || filters.maxPrice !== null;

  const reset = () => {
    setFilters(emptyFilters);
    setAdvanced(false);
  };

  return (
    <div className="bg-white pb-12 pt-[max(env(safe-area-inset-top),12px)]">
      <div className="space-y-4 px-4 pt-2">
        {/* 主要篩選 — 兩個 select 並排，mobile 觸控目標夠大 */}
        <div className="grid grid-cols-2 gap-2">
          <CompactSelect
            icon={MapPin}
            label="城市"
            value={filters.city}
            onChange={(v) => setFilters({ ...filters, city: v })}
            options={[
              ["", "全部城市"],
              ...activeCities.map(
                (c) => [c.name, c.name] as [string, string],
              ),
            ]}
          />
          <CompactSelect
            icon={PawPrint}
            label="寵物"
            value={filters.petType}
            onChange={(v) =>
              setFilters({ ...filters, petType: v as PetType | "" })
            }
            options={[
              ["", "不限寵物"],
              ...activePetTypes.map(
                (p) => [p.key, p.label] as [string, string],
              ),
            ]}
          />
        </div>

        {/* 進階篩選展開鈕 */}
        <button
          type="button"
          onClick={() => setAdvanced((v) => !v)}
          className={cn(
            "flex w-full items-center justify-between rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm font-medium text-neutral-700 transition-colors",
            advanced && "border-neutral-900 text-neutral-900",
          )}
        >
          <span className="inline-flex items-center gap-2">
            <Search className="h-4 w-4" />
            進階篩選（日期 / 預算）
            {hasAdvanced && (
              <span className="ml-1 inline-flex h-1.5 w-1.5 rounded-full bg-brand-500" />
            )}
          </span>
          <ChevronDown
            className={cn(
              "h-4 w-4 transition-transform",
              advanced && "rotate-180",
            )}
          />
        </button>

        {advanced && (
          <div className="space-y-3 rounded-xl border border-neutral-200 bg-white p-4">
            <div className="grid grid-cols-2 gap-2">
              <CompactInput
                icon={Calendar}
                label="入住"
                type="date"
                value={filters.checkIn}
                min={new Date().toISOString().slice(0, 10)}
                onChange={(v) => setFilters({ ...filters, checkIn: v })}
              />
              <CompactInput
                icon={Calendar}
                label="退房"
                type="date"
                value={filters.checkOut}
                min={
                  filters.checkIn || new Date().toISOString().slice(0, 10)
                }
                onChange={(v) => setFilters({ ...filters, checkOut: v })}
              />
            </div>
            <CompactInput
              icon={Wallet}
              label="每晚預算（NT$）"
              type="number"
              value={filters.maxPrice === null ? "" : String(filters.maxPrice)}
              placeholder="不限"
              onChange={(v) =>
                setFilters({
                  ...filters,
                  maxPrice: v ? Number(v) : null,
                })
              }
            />

            {(filters.city ||
              filters.petType ||
              filters.checkIn ||
              filters.checkOut ||
              filters.maxPrice !== null) && (
              <button
                type="button"
                onClick={reset}
                className="inline-flex w-full items-center justify-center gap-1 rounded-xl border border-neutral-200 bg-white py-2.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
              >
                <X className="h-3.5 w-3.5" />
                清除全部條件
              </button>
            )}
          </div>
        )}

        {/* 結果列表 */}
        <div>
          <p className="mb-3 text-xs text-neutral-500">
            {loading
              ? "搜尋中…"
              : error
                ? ""
                : `共 ${shops.length} 家符合條件`}
          </p>
          {error ? (
            <div className="rounded-card border border-neutral-200">
              <EmptyState icon={Search} title="搜尋失敗" description={error} />
            </div>
          ) : loading ? (
            <div className="flex justify-center py-12">
              <Spinner />
            </div>
          ) : shops.length === 0 ? (
            <div className="rounded-card border border-neutral-200">
              <EmptyState
                icon={Search}
                title="沒有符合的旅館"
                description="試試放寬日期或城市條件。"
              />
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {shops.map((s) => (
                <ShopCard key={s.id} shop={s} prefix="/liff/shop" />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CompactSelect({
  icon: Icon,
  label,
  value,
  onChange,
  options,
}: {
  icon: typeof MapPin;
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: [string, string][];
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-neutral-200 bg-white px-3 py-2.5 transition-colors focus-within:border-neutral-900">
      <Icon className="h-4 w-4 shrink-0 text-neutral-500" />
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
          {label}
        </p>
        <select
          className="search-select"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        >
          {options.map(([k, l]) => (
            <option key={k} value={k}>
              {l}
            </option>
          ))}
        </select>
      </div>
    </label>
  );
}

function CompactInput({
  icon: Icon,
  label,
  type = "text",
  value,
  onChange,
  placeholder,
  min,
}: {
  icon: typeof MapPin;
  label: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  min?: string;
}) {
  return (
    <label className="flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-3 py-2.5 transition-colors focus-within:border-neutral-900">
      <Icon className="h-4 w-4 shrink-0 text-neutral-500" />
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
          {label}
        </p>
        <input
          className="search-select"
          type={type}
          value={value}
          min={min}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
    </label>
  );
}

export function LiffDiscoverPage() {
  return (
    <LiffGate allowAnonymous>
      <DiscoverContent />
    </LiffGate>
  );
}
