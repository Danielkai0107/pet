// Edge Function: line-claim-booking
//
// Implicit binding for LIFF users who just submitted a booking. Because the
// caller already proved possession of the LINE account via LIFF, we skip the
// Email OTP step and directly:
//   - upsert customer (line_user_id) with the phone/email used in the booking
//   - set bookings.customer_id on the freshly-created booking
//   - backfill any other bookings whose guest_phone or guest_email matches
//
// Payload: { idToken, phone, email, bookingId }
//
// SECURITY note: we still verify the idToken against LINE's JWKs, so the
// caller has to be the actual LINE user. We *do* trust the phone/email they
// type — that's by design: this is the same trust model as a guest booking
// (anyone can type any phone), the difference is we attach it to *their own*
// LINE account, not someone else's.

import { handlePreflight, jsonResponse } from "../_shared/cors.ts";
import { adminClient } from "../_shared/supabase.ts";
import { verifyLineIdToken } from "../_shared/line.ts";

interface Payload {
  idToken?: string;
  phone?: string;
  email?: string;
  bookingId?: string;
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

  const channelId =
    Deno.env.get("LINE_LOGIN_CHANNEL_ID") ?? Deno.env.get("LINE_CHANNEL_ID");
  if (!channelId) {
    return jsonResponse(
      { error: "LINE_LOGIN_CHANNEL_ID (or LINE_CHANNEL_ID) not set" },
      { status: 500 },
    );
  }

  let body: Payload = {};
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "invalid json" }, { status: 400 });
  }

  if (!body.idToken || !body.bookingId || (!body.email && !body.phone)) {
    return jsonResponse(
      { error: "idToken, bookingId, and email or phone are required" },
      { status: 400 },
    );
  }

  let claims;
  try {
    claims = await verifyLineIdToken(body.idToken, channelId);
  } catch (e) {
    return jsonResponse(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 401 },
    );
  }

  const supa = adminClient();
  const email = body.email ? body.email.trim().toLowerCase() : null;
  const phone = body.phone ? normalizePhone(body.phone) : null;

  // 1) Upsert customer for this line_user_id with phone/email.
  const { data: existing } = await supa
    .from("customers")
    .select("id, email, phone")
    .eq("line_user_id", claims.sub)
    .maybeSingle();

  let customerId: string;
  if (existing) {
    await supa
      .from("customers")
      .update({
        // Prefer fresh value, fall back to whatever was already there.
        email: email ?? existing.email,
        phone: phone ?? existing.phone,
        display_name: claims.name ?? null,
        picture_url: claims.picture ?? null,
      })
      .eq("id", existing.id);
    customerId = existing.id;
  } else {
    const { data: created, error: cErr } = await supa
      .from("customers")
      .insert({
        line_user_id: claims.sub,
        email,
        phone,
        display_name: claims.name ?? null,
        picture_url: claims.picture ?? null,
      })
      .select("id")
      .single();
    if (cErr) return jsonResponse({ error: cErr.message }, { status: 500 });
    customerId = created.id;
  }

  // 2) Attach this customer to the just-created booking (always, regardless
  //    of phone/email match — the caller proved they own this booking by
  //    submitting it inside LIFF).
  await supa
    .from("bookings")
    .update({ customer_id: customerId })
    .eq("id", body.bookingId)
    .is("customer_id", null);

  // 3) Backfill any other bookings whose guest_phone or guest_email matches
  //    and have no owner yet. This is the bridge between web bookings and
  //    LIFF: book once on web with phone X, later add LINE friend and the
  //    LIFF order page automatically shows the previous booking.
  const orParts: string[] = [];
  if (email) orParts.push(`guest_email.eq.${email}`);
  if (phone) orParts.push(`guest_phone.eq.${phone}`);
  let backfilled = 0;
  if (orParts.length > 0) {
    const { count } = await supa
      .from("bookings")
      .update({ customer_id: customerId }, { count: "exact" })
      .or(orParts.join(","))
      .is("customer_id", null);
    backfilled = count ?? 0;
  }

  return jsonResponse({
    ok: true,
    customerId,
    backfilled,
  });
});
