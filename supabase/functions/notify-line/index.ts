// Edge Function: notify-line
//
// Push a Flex Message bubble to the bound LINE user for a booking lifecycle
// event. Idempotently logs to `notifications`. Silently no-ops (200 OK)
// when the booking has no LINE-bound customer yet — that's the correct
// behaviour for guest bookings made on the public web before the user
// added our LINE OA.
//
// Payload: { bookingId, kind }

import { handlePreflight, jsonResponse } from "../_shared/cors.ts";
import { adminClient } from "../_shared/supabase.ts";
import { pushLineFlex } from "../_shared/line.ts";
import {
  buildBookingAltText,
  buildBookingBubble,
  type LineNotifyKind,
} from "../_shared/flex.ts";

interface Payload {
  bookingId?: string;
  kind?: LineNotifyKind;
}

interface BookingRow {
  id: string;
  code: string;
  shop_id: string;
  room_id: string;
  customer_id: string | null;
  guest_name: string;
  guest_phone: string | null;
  guest_email: string | null;
  pet_name: string;
  check_in_date: string;
  check_out_date: string;
  nights: number;
  total_price: number;
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
  if (!body.bookingId || !body.kind) {
    return jsonResponse(
      { error: "bookingId and kind required" },
      { status: 400 },
    );
  }

  const supa = adminClient();

  const { data: booking } = await supa
    .from("bookings")
    .select(
      "id,code,shop_id,room_id,customer_id,guest_name,guest_phone,guest_email,pet_name,check_in_date,check_out_date,nights,total_price",
    )
    .eq("id", body.bookingId)
    .maybeSingle<BookingRow>();
  if (!booking) {
    return jsonResponse({ error: "booking not found" }, { status: 404 });
  }

  // Resolve a LINE-bound customer for this booking. Order of preference:
  //   1. booking.customer_id directly
  //   2. customers matching guest_phone
  //   3. customers matching guest_email
  // (2) and (3) bridge guest bookings made before the user bound LINE.
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
    // No LINE binding yet — silent no-op so callers can fire-and-forget.
    return jsonResponse({ ok: true, sent: false, reason: "no_line_user" });
  }

  // Look up display data for the bubble.
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

  // CTA deeplink — points straight to the booking detail page inside LIFF.
  // Requires LIFF Endpoint URL in LINE Console to be set to
  // `https://<your-domain>/liff/`; LIFF then appends `booking/<code>` to
  // produce `/liff/booking/<code>` which renders BookingViewPage with the
  // bottom "取消預約" CTA.
  const liffId = Deno.env.get("LIFF_ID");
  const detailUrl = liffId
    ? `https://liff.line.me/${liffId}/booking/${booking.code}`
    : (Deno.env.get("PUBLIC_SITE_URL") ?? "").replace(/\/$/, "") +
      `/booking/${booking.code}`;

  const bubble = buildBookingBubble(body.kind, {
    shopName: shop?.name ?? "(店家)",
    bookingCode: booking.code,
    guestName: booking.guest_name,
    petName: booking.pet_name,
    roomName: room?.name ?? "(房型)",
    checkInDate: booking.check_in_date,
    checkOutDate: booking.check_out_date,
    nights: booking.nights,
    totalPrice: booking.total_price,
    detailUrl,
  });
  const altText = buildBookingAltText(body.kind, {
    shopName: shop?.name ?? "",
    bookingCode: booking.code,
    guestName: booking.guest_name,
    petName: booking.pet_name,
    roomName: room?.name ?? "",
    checkInDate: booking.check_in_date,
    checkOutDate: booking.check_out_date,
    nights: booking.nights,
    totalPrice: booking.total_price,
  });

  let sendStatus: "sent" | "failed" = "sent";
  let sendError: string | null = null;
  try {
    await pushLineFlex({
      to: lineUserId,
      altText,
      bubble,
      channelAccessToken,
    });
  } catch (e) {
    sendStatus = "failed";
    sendError = e instanceof Error ? e.message : String(e);
  }

  await supa.from("notifications").insert({
    booking_id: booking.id,
    customer_id: resolvedCustomerId,
    channel: "line",
    kind: body.kind,
    to_address: lineUserId,
    subject: null,
    content: altText,
    status: sendStatus,
    error: sendError,
    sent_at: sendStatus === "sent" ? new Date().toISOString() : null,
  });

  if (sendStatus === "failed") {
    return jsonResponse({ ok: false, error: sendError }, { status: 502 });
  }
  return jsonResponse({ ok: true, sent: true });
});
