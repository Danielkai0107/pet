// Client-side helper: trigger a LINE Flex push for a booking.
// Server (notify-line edge fn) silently no-ops when the booking has no
// LINE-bound customer, so callers can fire-and-forget without checking.

import { supabase } from "./supabase";
import type { NotificationKind } from "./types";

export async function sendBookingLine(payload: {
  bookingId: string;
  kind: NotificationKind;
}) {
  const { data, error } = await supabase.functions.invoke("notify-line", {
    body: payload,
  });
  if (error) throw error;
  return data;
}
