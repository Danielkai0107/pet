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
}

/**
 * Trip.com 風搜尋條：水平 pill-style 排列，五個欄位用 separator 分隔，
 * 右側放大型「搜尋」CTA。RWD：mobile 改成 grid，pill 樣式自動變回普通
 * card grid。
 */
export function ShopSearchPanel({ filters, onChange }: Props) {
  const hasFilters =
    filters.city ||
    filters.petType ||
    filters.checkIn ||
    filters.checkOut ||
    filters.maxPrice !== null;

  return (
    <div className="card overflow-hidden p-1.5 sm:p-2">
      <div className="grid gap-1 sm:grid-cols-5 sm:items-stretch sm:divide-x sm:divide-slate-200">
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
      </div>

      {hasFilters && (
        <div className="mt-2 flex items-center justify-between border-t border-slate-100 px-2.5 pt-2 text-xs text-slate-500">
          <span className="inline-flex items-center gap-1">
            <Search className="h-3.5 w-3.5" />
            已套用篩選條件
          </span>
          <button
            className="inline-flex items-center gap-1 font-semibold text-brand-700 hover:underline"
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
    <label className="flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 transition-colors hover:bg-slate-50">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
          {label}
        </p>
        <div className="-ml-0.5 mt-0.5">{children}</div>
      </div>
    </label>
  );
}
