import { Calendar, MapPin, PawPrint, Search, Wallet, X } from "lucide-react";
import { PET_TYPE_LABEL, TAIWAN_CITIES } from "@/lib/constants";
import type { PetType } from "@/lib/types";
import {
  emptyFilters,
  type ShopSearchFilters,
} from "@/web/hooks/useShopSearch";

interface Props {
  filters: ShopSearchFilters;
  onChange: (next: ShopSearchFilters) => void;
  /**
   * 點擊右側送出按鈕時觸發。父層通常用來：
   *   - HomePage：navigate(`/shops?…`) 帶著當前篩選跳到搜尋結果頁
   *   - ShopsPage：scrollIntoView 把畫面捲到結果列表
   * 若不提供，按鈕仍可顯示但不做任何事。
   */
  onSubmit?: () => void;
}

/**
 * Airbnb 風搜尋膠囊：
 *   - Desktop：水平 5 欄 + 右側圓品牌色搜尋按鈕；欄位之間「沒有」分隔線，
 *     讓畫面更乾淨；只在送出按鈕左邊保留一條細直線當作分組視覺。
 *   - Mobile：垂直堆疊；底部一顆全寬的搜尋按鈕。
 */
export function ShopSearchPanel({ filters, onChange, onSubmit }: Props) {
  const hasFilters =
    filters.city ||
    filters.petType ||
    filters.checkIn ||
    filters.checkOut ||
    filters.maxPrice !== null;

  return (
    <div className="rounded-3xl border border-neutral-200 bg-white shadow-sm sm:rounded-full sm:p-1.5">
      <div className="grid gap-1 p-2 sm:grid-cols-[1fr,1fr,1fr,1fr,1fr,auto] sm:items-stretch sm:gap-0 sm:p-0">
        <SearchField icon={MapPin} label="城市">
          <select
            className="search-select"
            value={filters.city}
            onChange={(e) => onChange({ ...filters, city: e.target.value })}
          >
            <option value="">全部</option>
            {TAIWAN_CITIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </SearchField>

        <SearchField icon={PawPrint} label="寵物">
          <select
            className="search-select"
            value={filters.petType}
            onChange={(e) =>
              onChange({ ...filters, petType: e.target.value as PetType | "" })
            }
          >
            <option value="">不限</option>
            {(Object.keys(PET_TYPE_LABEL) as PetType[]).map((p) => (
              <option key={p} value={p}>
                {PET_TYPE_LABEL[p]}
              </option>
            ))}
          </select>
        </SearchField>

        <SearchField icon={Calendar} label="入住">
          <input
            type="date"
            className="search-select"
            value={filters.checkIn}
            onChange={(e) => onChange({ ...filters, checkIn: e.target.value })}
            min={new Date().toISOString().slice(0, 10)}
          />
        </SearchField>

        <SearchField icon={Calendar} label="退房">
          <input
            type="date"
            className="search-select"
            value={filters.checkOut}
            onChange={(e) => onChange({ ...filters, checkOut: e.target.value })}
            min={filters.checkIn || new Date().toISOString().slice(0, 10)}
          />
        </SearchField>

        <SearchField icon={Wallet} label="每晚預算">
          <input
            type="number"
            min={0}
            step={100}
            className="search-select"
            value={filters.maxPrice ?? ""}
            placeholder="不限"
            onChange={(e) =>
              onChange({
                ...filters,
                maxPrice: e.target.value ? Number(e.target.value) : null,
              })
            }
          />
        </SearchField>

        {/* 送出按鈕 — 只有這裡保留一條左側細直線當分隔，並留出 padding 讓按鈕呼吸 */}
        <div className="hidden items-center gap-3 pl-3 pr-1.5 sm:flex sm:border-l sm:border-neutral-200">
          <button
            type="button"
            onClick={onSubmit}
            className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-brand-500 text-white shadow-sm transition-colors hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
            aria-label="搜尋"
          >
            <Search className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="px-3 pb-2 sm:hidden">
        <button
          type="button"
          onClick={onSubmit}
          className="btn-primary w-full"
        >
          <Search className="h-4 w-4" />
          搜尋
        </button>
      </div>

      {hasFilters && (
        <div className="flex items-center justify-between border-t border-neutral-100 px-4 py-2 text-xs text-neutral-500 sm:rounded-b-full">
          <span className="inline-flex items-center gap-1">
            <Search className="h-3.5 w-3.5" />
            已套用篩選條件
          </span>
          <button
            className="inline-flex items-center gap-1 font-semibold text-neutral-900 hover:underline"
            onClick={() => onChange(emptyFilters)}
          >
            <X className="h-3.5 w-3.5" />
            清除
          </button>
        </div>
      )}
    </div>
  );
}

function SearchField({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof MapPin;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="group flex cursor-pointer items-center gap-2.5 rounded-full px-3 py-2 transition-colors hover:bg-neutral-50">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-neutral-700">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
          {label}
        </p>
        <div className="-ml-0.5 mt-0.5">{children}</div>
      </div>
    </label>
  );
}
