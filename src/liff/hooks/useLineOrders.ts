import { useEffect, useState } from "react";
import { supabase, formatSupabaseError } from "@/lib/supabase";
import type { Booking } from "@/lib/types";
import { useLiffAuth } from "@/liff/auth/useLiffAuth";

export interface LineBookingWithRefs extends Booking {
  shop: {
    id: string;
    slug: string;
    name: string;
    city: string | null;
    district: string | null;
    cover_image_url: string | null;
  } | null;
  room: { id: string; name: string } | null;
}

export function useLineOrders(
  scope: "active" | "history" | "all" = "active",
) {
  const { idToken, customer } = useLiffAuth();
  const [bookings, setBookings] = useState<LineBookingWithRefs[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!idToken) {
        setLoading(false);
        return;
      }
      setLoading(true);
      const { data, error: invErr } = await supabase.functions.invoke(
        "line-orders",
        { body: { idToken, scope } },
      );
      if (cancelled) return;
      if (invErr) {
        setError(formatSupabaseError(invErr));
        setBookings([]);
        setLoading(false);
        return;
      }
      const list =
        (data as { bookings?: LineBookingWithRefs[] })?.bookings ?? [];
      setBookings(list);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
    // include customer.id so refresh after binding re-fetches
  }, [idToken, scope, customer?.id]);

  return { bookings, loading, error };
}
