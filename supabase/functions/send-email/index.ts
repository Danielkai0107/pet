// Edge Function: send-email
// Sends a transactional email for a booking using the shop's template
// (or the platform default), via the Resend API. Logs to `notifications`.

import { handlePreflight, jsonResponse } from "../_shared/cors.ts";
import { adminClient } from "../_shared/supabase.ts";
import {
  DEFAULT_TEMPLATES,
  fillTemplate,
  type NotificationKind,
} from "../_shared/templates.ts";

interface Payload {
  bookingId?: string;
  kind?: NotificationKind;
  to?: string;
}

interface BookingRow {
  id: string;
  code: string;
  shop_id: string;
  room_id: string;
  guest_name: string;
  guest_email: string;
  pet_name: string;
  check_in_date: string;
  check_out_date: string;
  nights: number;
  total_price: number;
}

const RESEND_ENDPOINT = "https://api.resend.com/emails";

Deno.serve(async (req: Request) => {
  const preflight = handlePreflight(req);
  if (preflight) return preflight;

  if (req.method !== "POST") {
    return jsonResponse({ error: "method not allowed" }, { status: 405 });
  }

  let body: Payload = {};
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "invalid json" }, { status: 400 });
  }

  const { bookingId, kind, to: overrideTo } = body;
  if (!bookingId || !kind) {
    return jsonResponse(
      { error: "bookingId and kind are required" },
      { status: 400 },
    );
  }

  const supa = adminClient();

  const { data: booking, error: bErr } = await supa
    .from("bookings")
    .select(
      "id,code,shop_id,room_id,guest_name,guest_email,pet_name,check_in_date,check_out_date,nights,total_price",
    )
    .eq("id", bookingId)
    .maybeSingle<BookingRow>();
  if (bErr || !booking) {
    return jsonResponse(
      { error: bErr?.message ?? "booking not found" },
      { status: 404 },
    );
  }

  const { data: shop } = await supa
    .from("shops")
    .select("name")
    .eq("id", booking.shop_id)
    .maybeSingle<{ name: string }>();
  const { data: room } = await supa
    .from("rooms")
    .select("name")
    .eq("id", booking.room_id)
    .maybeSingle<{ name: string }>();

  const { data: customTpl } = await supa
    .from("notification_templates")
    .select("subject,body")
    .eq("shop_id", booking.shop_id)
    .eq("kind", kind)
    .maybeSingle<{ subject: string; body: string }>();

  const tpl = customTpl ?? DEFAULT_TEMPLATES[kind];
  const lineUrl = Deno.env.get("LINE_ADD_FRIEND_URL") ?? "";
  const siteUrl = (Deno.env.get("PUBLIC_SITE_URL") ?? "").replace(/\/$/, "");
  const detailUrl = siteUrl ? `${siteUrl}/booking/${booking.code}` : "";
  const vars: Record<string, string | number> = {
    shop_name: shop?.name ?? "",
    booking_code: booking.code,
    guest_name: booking.guest_name,
    pet_name: booking.pet_name,
    room_name: room?.name ?? "",
    check_in_date: booking.check_in_date,
    check_out_date: booking.check_out_date,
    nights: booking.nights,
    total_price: booking.total_price,
    line_add_friend_url: lineUrl,
    booking_detail_url: detailUrl,
  };

  const subject = fillTemplate(tpl.subject, vars);
  const text = fillTemplate(tpl.body, vars);
  const recipient = overrideTo ?? booking.guest_email;

  const resendKey = Deno.env.get("RESEND_API_KEY");
  const fromAddr =
    Deno.env.get("EMAIL_FROM") ?? "PetStay <noreply@example.com>";

  let sendStatus: "sent" | "failed" | "queued" = "queued";
  let sendError: string | null = null;

  if (resendKey) {
    try {
      const res = await fetch(RESEND_ENDPOINT, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendKey}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          from: fromAddr,
          to: [recipient],
          subject,
          text,
        }),
      });
      if (!res.ok) {
        sendStatus = "failed";
        sendError = await res.text();
      } else {
        sendStatus = "sent";
      }
    } catch (e) {
      sendStatus = "failed";
      sendError = e instanceof Error ? e.message : String(e);
    }
  } else {
    console.log("[send-email] RESEND_API_KEY missing — logging to notifications only");
  }

  const { error: notifErr } = await supa.from("notifications").insert({
    booking_id: booking.id,
    channel: "email",
    kind,
    to_address: recipient,
    subject,
    content: text,
    status: sendStatus,
    error: sendError,
    sent_at: sendStatus === "sent" ? new Date().toISOString() : null,
  });
  if (notifErr) {
    console.warn("[send-email] failed to log notification", notifErr);
  }

  return jsonResponse({
    ok: sendStatus !== "failed",
    status: sendStatus,
    error: sendError,
  });
});
