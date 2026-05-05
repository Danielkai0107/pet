// Edge Function: line-me
// Verifies a LINE id_token and upserts a `customers` row.
// Returns the customer record so the LIFF client can hydrate.

import { handlePreflight, jsonResponse } from "../_shared/cors.ts";
import { adminClient } from "../_shared/supabase.ts";
import { verifyLineIdToken } from "../_shared/line.ts";

interface Payload {
  idToken?: string;
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
  const { data: existing } = await supa
    .from("customers")
    .select("*")
    .eq("line_user_id", claims.sub)
    .maybeSingle();

  let customer = existing;
  if (!customer) {
    const { data: created, error: insErr } = await supa
      .from("customers")
      .insert({
        line_user_id: claims.sub,
        display_name: claims.name ?? null,
        picture_url: claims.picture ?? null,
        email: claims.email ?? null,
        last_active_at: new Date().toISOString(),
      })
      .select("*")
      .single();
    if (insErr) {
      return jsonResponse({ error: insErr.message }, { status: 500 });
    }
    customer = created;
  } else {
    await supa
      .from("customers")
      .update({
        display_name: claims.name ?? customer.display_name,
        picture_url: claims.picture ?? customer.picture_url,
        last_active_at: new Date().toISOString(),
      })
      .eq("id", customer.id);
  }

  return jsonResponse({ ok: true, customer });
});
