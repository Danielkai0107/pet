import { Filter, X } from "lucide-react";
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

export function ShopSearchPanel({ filters, onChange }: Props) {
  const hasFilters =
    filters.city ||
    filters.petType ||
    filters.checkIn ||
    filters.checkOut ||
    filters.maxPrice !== null;

  return (
    <div className="card p-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <div>
          <label className="label text-xs">城市</label>
          <select
            className="input"
            value={filters.city}
            onChange={(e) => onChange({ ...filters, city: e.target.value })}
          >
            <option value="">全部城市</option>
            {TAIWAN_CITIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="label text-xs">寵物</label>
          <select
            className="input"
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
        </div>

        <div>
          <label className="label text-xs">入住</label>
          <input
            type="date"
            className="input"
            value={filters.checkIn}
            onChange={(e) => onChange({ ...filters, checkIn: e.target.value })}
            min={new Date().toISOString().slice(0, 10)}
          />
        </div>

        <div>
          <label className="label text-xs">退房</label>
          <input
            type="date"
            className="input"
            value={filters.checkOut}
            onChange={(e) => onChange({ ...filters, checkOut: e.target.value })}
            min={
              filters.checkIn || new Date().toISOString().slice(0, 10)
            }
          />
        </div>

        <div>
          <label className="label text-xs">每晚最高 (TWD)</label>
          <input
            type="number"
            className="input"
            min={0}
            step={100}
            value={filters.maxPrice ?? ""}
            placeholder="不限"
            onChange={(e) =>
              onChange({
                ...filters,
                maxPrice: e.target.value ? Number(e.target.value) : null,
              })
            }
          />
        </div>
      </div>

      {hasFilters && (
        <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
          <span className="inline-flex items-center gap-1">
            <Filter className="h-3.5 w-3.5" />
            已套用篩選
          </span>
          <button
            className="inline-flex items-center gap-1 text-brand-700 hover:underline"
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
