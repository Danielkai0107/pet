import { useEffect, useState } from "react";
import { supabase, formatSupabaseError } from "@/lib/supabase";
import type { PetType, ShopSearchResult } from "@/lib/types";

export interface ShopSearchFilters {
  city: string;
  petType: PetType | "";
  checkIn: string;
  checkOut: string;
  maxPrice: number | null;
}

export const emptyFilters: ShopSearchFilters = {
  city: "",
  petType: "",
  checkIn: "",
  checkOut: "",
  maxPrice: null,
};

/** Serialize filters to URL search params (empty fields are omitted). */
export function filtersToSearchParams(
  filters: ShopSearchFilters,
): URLSearchParams {
  const sp = new URLSearchParams();
  if (filters.city) sp.set("city", filters.city);
  if (filters.petType) sp.set("pet", filters.petType);
  if (filters.checkIn) sp.set("in", filters.checkIn);
  if (filters.checkOut) sp.set("out", filters.checkOut);
  if (filters.maxPrice !== null) sp.set("price", String(filters.maxPrice));
  return sp;
}

/** Parse URL search params back into filter shape. */
export function filtersFromSearchParams(
  sp: URLSearchParams,
): ShopSearchFilters {
  const priceRaw = sp.get("price");
  return {
    city: sp.get("city") ?? "",
    petType: (sp.get("pet") as PetType | null) ?? "",
    checkIn: sp.get("in") ?? "",
    checkOut: sp.get("out") ?? "",
    maxPrice: priceRaw ? Number(priceRaw) : null,
  };
}

export function useShopSearch(filters: ShopSearchFilters) {
  const [shops, setShops] = useState<ShopSearchResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      const { data, error: err } = await supabase.rpc("search_shops", {
        p_city: filters.city || null,
        p_pet_type: filters.petType || null,
        p_check_in: filters.checkIn || null,
        p_check_out: filters.checkOut || null,
        p_max_price: filters.maxPrice ?? null,
      });
      if (cancelled) return;
      if (err) {
        setError(formatSupabaseError(err));
        setShops([]);
      } else {
        setShops((data ?? []) as ShopSearchResult[]);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [
    filters.city,
    filters.petType,
    filters.checkIn,
    filters.checkOut,
    filters.maxPrice,
  ]);

  return { shops, loading, error };
}
