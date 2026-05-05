// Edge Function: line-orders
// Returns the bookings for the LINE user identified by the id_token.
// Optionally filtered by lifecycle group.

import { handlePreflight, jsonResponse } from "../_shared/cors.ts";
import { adminClient } from "../_shared/supabase.ts";
import { verifyLineIdToken } from "../_shared/line.ts";

interface Payload {
  idToken?: string;
  /** "active" = pending|confirmed|checked_in. "history" = checked_out|cancelled|declined|no_show. */
  scope?: "active" | "history" | "all";
}

const ACTIVE = ["pending", "confirmed", "checked_in"];
const HISTORY = ["checked_out", "cancelled", "declined", "no_show"];

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
  if (!body.idToken) {
    return jsonResponse({ error: "idToken required" }, { status: 400 });
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
  const { data: customer } = await supa
    .from("customers")
    .select("id, email, phone")
    .eq("line_user_id", claims.sub)
    .maybeSingle();
  if (!customer) {
    return jsonResponse({ ok: true, bookings: [] });
  }

  const scope = body.scope ?? "active";
  const statuses =
    scope === "active" ? ACTIVE : scope === "history" ? HISTORY : null;

  // Match bookings by any of:
  //   - customer_id = current customer (ones already linked)
  //   - guest_email = current customer's email
  //   - guest_phone = current customer's phone
  // Phone/email match catches old web bookings made before user bound LINE.
  const orParts: string[] = [`customer_id.eq.${customer.id}`];
  if (customer.email) orParts.push(`guest_email.eq.${customer.email}`);
  if (customer.phone) orParts.push(`guest_phone.eq.${customer.phone}`);

  let q = supa
    .from("bookings")
    .select(
      "*, shop:shops(id,slug,name,city,district,cover_image_url), room:rooms(id,name)",
    )
    .or(orParts.join(","))
    .order("check_in_date", { ascending: scope === "active" });
  if (statuses) q = q.in("status", statuses);

  const { data, error } = await q;
  if (error) return jsonResponse({ error: error.message }, { status: 500 });

  return jsonResponse({ ok: true, bookings: data ?? [] });
});
