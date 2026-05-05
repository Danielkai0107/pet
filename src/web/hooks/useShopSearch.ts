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
