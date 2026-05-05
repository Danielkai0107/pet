// Client-side helpers for triggering emails via Edge Functions.
// Actual sending lives in supabase/functions/send-email/.

import { supabase } from "./supabase";
import type { NotificationKind } from "./types";

export interface SendEmailPayload {
  bookingId: string;
  kind: NotificationKind;
  /** Optional: override recipient. Defaults to booking.guest_email. */
  to?: string;
}

export async function sendBookingEmail(payload: SendEmailPayload) {
  const { data, error } = await supabase.functions.invoke("send-email", {
    body: payload,
  });
  if (error) throw error;
  return data;
}
