import { useCallback, useEffect, useState } from "react";
import { supabase, formatSupabaseError } from "@/lib/supabase";
import type { Room } from "@/lib/types";

export function useRooms(shopId: string | undefined) {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!shopId) {
      setRooms([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase
      .from("rooms")
      .select("*")
      .eq("shop_id", shopId)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });
    if (err) {
      setError(formatSupabaseError(err));
      setRooms([]);
    } else {
      setRooms((data ?? []) as Room[]);
    }
    setLoading(false);
  }, [shopId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { rooms, loading, error, reload };
}
