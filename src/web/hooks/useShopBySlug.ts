import { useEffect, useState } from "react";
import { supabase, formatSupabaseError } from "@/lib/supabase";
import type { Room, Shop } from "@/lib/types";

export interface ShopWithRooms {
  shop: Shop;
  rooms: Room[];
}

export function useShopBySlug(slug: string | undefined) {
  const [data, setData] = useState<ShopWithRooms | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!slug) {
        setData(null);
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      const { data: shop, error: shopErr } = await supabase
        .from("shops")
        .select("*")
        .eq("slug", slug)
        .eq("status", "active")
        .maybeSingle();

      if (cancelled) return;
      if (shopErr) {
        setError(formatSupabaseError(shopErr));
        setLoading(false);
        return;
      }
      if (!shop) {
        setData(null);
        setLoading(false);
        return;
      }

      const { data: rooms, error: roomsErr } = await supabase
        .from("rooms")
        .select("*")
        .eq("shop_id", shop.id)
        .eq("is_active", true)
        .order("sort_order", { ascending: true });

      if (cancelled) return;
      if (roomsErr) {
        setError(formatSupabaseError(roomsErr));
      } else {
        setData({ shop: shop as Shop, rooms: (rooms ?? []) as Room[] });
      }
      setLoading(false);
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  return { data, loading, error };
}
