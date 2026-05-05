import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { supabase, formatSupabaseError } from "@/lib/supabase";
import type { Booking, BookingStatus } from "@/lib/types";

interface Options {
  shopId: string | undefined;
  status?: BookingStatus | "all";
  /** Subscribe to inserts/updates for this shop_id (Realtime). */
  realtime?: boolean;
}

export function useBookings({ shopId, status = "all", realtime }: Options) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!shopId) {
      setBookings([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    let q = supabase
      .from("bookings")
      .select("*")
      .eq("shop_id", shopId)
      .order("created_at", { ascending: false });
    if (status !== "all") {
      q = q.eq("status", status);
    }
    const { data, error } = await q;
    if (error) {
      toast.error(formatSupabaseError(error));
      setBookings([]);
    } else {
      setBookings((data ?? []) as Booking[]);
    }
    setLoading(false);
  }, [shopId, status]);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    if (!shopId || !realtime) return;

    const channel = supabase
      .channel(`shop-bookings:${shopId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "bookings",
          filter: `shop_id=eq.${shopId}`,
        },
        (payload) => {
          toast.success(`新預約來了：${(payload.new as Booking).guest_name}`);
          void reload();
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "bookings",
          filter: `shop_id=eq.${shopId}`,
        },
        () => {
          void reload();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [shopId, realtime, reload]);

  return { bookings, loading, reload };
}
