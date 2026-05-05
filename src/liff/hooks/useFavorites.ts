import { useCallback, useEffect, useState } from "react";
import { supabase, formatSupabaseError } from "@/lib/supabase";
import type { PetType, ShopStatus } from "@/lib/types";
import { useLiffAuth } from "@/liff/auth/useLiffAuth";

export interface FavoriteRow {
  id: string;
  created_at: string;
  shop: {
    id: string;
    slug: string;
    name: string;
    city: string | null;
    district: string | null;
    cover_image_url: string | null;
    pet_types: PetType[];
    status: ShopStatus;
  } | null;
}

export function useFavorites() {
  const { idToken } = useLiffAuth();
  const [favorites, setFavorites] = useState<FavoriteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!idToken) {
      setFavorites([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error: invErr } = await supabase.functions.invoke(
      "line-favorites",
      { body: { idToken, action: "list" } },
    );
    if (invErr) {
      setError(formatSupabaseError(invErr));
      setFavorites([]);
    } else {
      setFavorites(((data as { favorites?: FavoriteRow[] })?.favorites) ?? []);
      setError(null);
    }
    setLoading(false);
  }, [idToken]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const add = useCallback(
    async (shopId: string) => {
      if (!idToken) return;
      const { error: invErr } = await supabase.functions.invoke(
        "line-favorites",
        { body: { idToken, action: "add", shopId } },
      );
      if (!invErr) await reload();
      return invErr;
    },
    [idToken, reload],
  );

  const remove = useCallback(
    async (shopId: string) => {
      if (!idToken) return;
      const { error: invErr } = await supabase.functions.invoke(
        "line-favorites",
        { body: { idToken, action: "remove", shopId } },
      );
      if (!invErr) await reload();
      return invErr;
    },
    [idToken, reload],
  );

  return { favorites, loading, error, reload, add, remove };
}
