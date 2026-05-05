// Edge Function: notify-stay-log
//
// Push a "stay log" Flex message (photos + note) to the bound LINE user
// for a specific `booking_logs` row. Idempotently:
//   - Updates `booking_logs.notify_status` (sent / failed / no_line)
//   - Inserts a row in `notifications` (kind=stay_log)
//
// Silently no-ops (200 OK + notify_status=no_line) when the booking has
// no LINE-bound customer yet — that's the correct behaviour: the staff
// still gets a recorded log, just no push.
//
// Payload: { logId }

import { handlePreflight, jsonResponse } from "../_shared/cors.ts";
import { adminClient } from "../_shared/supabase.ts";
import { pushLineFlex } from "../_shared/line.ts";
import {
  buildStayLogAltText,
  buildStayLogContents,
} from "../_shared/flex.ts";

interface Payload {
  logId?: string;
}

interface LogRow {
  id: string;
  booking_id: string;
  shop_id: string;
  photo_urls: string[];
  note: string | null;
  notify_status: string;
  created_at: string;
}

interface BookingRow {
  id: string;
  code: string;
  customer_id: string | null;
  guest_name: string;
  guest_phone: string | null;
  guest_email: string | null;
  pet_name: string;
}

function normalizePhone(p: string): string {
  return p.replace(/[\s\-()]/g, "").replace(/^\+886/, "0");
}

Deno.serve(async (req: Request) => {
  const preflight = handlePreflight(req);
  if (preflight) return preflight;
  if (req.method !== "POST") {
    return jsonResponse({ error: "method not allowed" }, { status: 405 });
  }

  const channelAccessToken = Deno.env.get("LINE_CHANNEL_ACCESS_TOKEN");
  if (!channelAccessToken) {
    return jsonResponse(
      { error: "LINE_CHANNEL_ACCESS_TOKEN not set" },
      { status: 500 },
    );
  }

  let body: Payload = {};
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "invalid json" }, { status: 400 });
  }
  if (!body.logId) {
    return jsonResponse({ error: "logId required" }, { status: 400 });
  }

  const supa = adminClient();

  const { data: log } = await supa
    .from("booking_logs")
    .select(
      "id, booking_id, shop_id, photo_urls, note, notify_status, created_at",
    )
    .eq("id", body.logId)
    .maybeSingle<LogRow>();
  if (!log) {
    return jsonResponse({ error: "log not found" }, { status: 404 });
  }

  // Idempotency: if already sent, return ok and don't re-push.
  if (log.notify_status === "sent") {
    return jsonResponse({ ok: true, sent: true, alreadySent: true });
  }

  const { data: booking } = await supa
    .from("bookings")
    .select(
      "id, code, customer_id, guest_name, guest_phone, guest_email, pet_name",
    )
    .eq("id", log.booking_id)
    .maybeSingle<BookingRow>();
  if (!booking) {
    return jsonResponse({ error: "booking not found" }, { status: 404 });
  }

  // Resolve a LINE-bound customer for this booking. Order of preference:
  //   1. booking.customer_id directly
  //   2. customers matching guest_phone
  //   3. customers matching guest_email
  let lineUserId: string | null = null;
  let resolvedCustomerId: string | null = null;
  if (booking.customer_id) {
    const { data } = await supa
      .from("customers")
      .select("id, line_user_id")
      .eq("id", booking.customer_id)
      .maybeSingle();
    if (data?.line_user_id) {
      lineUserId = data.line_user_id;
      resolvedCustomerId = data.id;
    }
  }
  if (!lineUserId && booking.guest_phone) {
    const phone = normalizePhone(booking.guest_phone);
    const { data } = await supa
      .from("customers")
      .select("id, line_user_id")
      .eq("phone", phone)
      .not("line_user_id", "is", null)
      .maybeSingle();
    if (data?.line_user_id) {
      lineUserId = data.line_user_id;
      resolvedCustomerId = data.id;
    }
  }
  if (!lineUserId && booking.guest_email) {
    const { data } = await supa
      .from("customers")
      .select("id, line_user_id")
      .eq("email", booking.guest_email.toLowerCase())
      .not("line_user_id", "is", null)
      .maybeSingle();
    if (data?.line_user_id) {
      lineUserId = data.line_user_id;
      resolvedCustomerId = data.id;
    }
  }

  if (!lineUserId) {
    // No LINE binding — record-only, no push. Mark log accordingly.
    await supa
      .from("booking_logs")
      .update({ notify_status: "no_line" })
      .eq("id", log.id);
    return jsonResponse({ ok: true, sent: false, reason: "no_line" });
  }

  // Look up shop name + OA URL for the bubble title and CTA.
  const { data: shop } = await supa
    .from("shops")
    .select("name, line_oa_url")
    .eq("id", log.shop_id)
    .maybeSingle<{ name: string; line_oa_url: string | null }>();

  // Fallback CTA — booking detail inside LIFF (used when shop has no
  // line_oa_url). Primary CTA is 「聯絡旅館」 which opens shop's OA.
  const liffId = Deno.env.get("LIFF_ID");
  const detailUrl = liffId
    ? `https://liff.line.me/${liffId}/booking/${booking.code}`
    : (Deno.env.get("PUBLIC_SITE_URL") ?? "").replace(/\/$/, "") +
      `/booking/${booking.code}`;

  const flexVars = {
    shopName: shop?.name ?? "(店家)",
    petName: booking.pet_name,
    guestName: booking.guest_name,
    bookingCode: booking.code,
    photoUrls: log.photo_urls ?? [],
    note: log.note,
    shopLineOaUrl: shop?.line_oa_url ?? null,
    detailUrl,
    takenAt: log.created_at,
  };
  const contents = buildStayLogContents(flexVars);
  const altText = buildStayLogAltText(flexVars);

  let sendStatus: "sent" | "failed" = "sent";
  let sendError: string | null = null;
  try {
    await pushLineFlex({
      to: lineUserId,
      altText,
      bubble: contents,
      channelAccessToken,
    });
  } catch (e) {
    sendStatus = "failed";
    sendError = e instanceof Error ? e.message : String(e);
  }

  const sentAt = sendStatus === "sent" ? new Date().toISOString() : null;
  await supa
    .from("booking_logs")
    .update({
      notify_status: sendStatus,
      notify_error: sendError,
      notify_sent_at: sentAt,
      notify_to_line_user_id: lineUserId,
    })
    .eq("id", log.id);

  await supa.from("notifications").insert({
    booking_id: booking.id,
    customer_id: resolvedCustomerId,
    channel: "line",
    kind: "stay_log",
    to_address: lineUserId,
    subject: null,
    content: altText,
    status: sendStatus,
    error: sendError,
    sent_at: sentAt,
  });

  if (sendStatus === "failed") {
    return jsonResponse({ ok: false, error: sendError }, { status: 502 });
  }
  return jsonResponse({ ok: true, sent: true });
});
