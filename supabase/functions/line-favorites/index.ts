// Edge Function: line-favorites
// Manage favorite shops for a LINE user (verified via id_token).
//
// action=list                          -> list favorites with shop info
// action=add    + shopId               -> upsert favorite
// action=remove + shopId               -> delete favorite

import { handlePreflight, jsonResponse } from "../_shared/cors.ts";
import { adminClient } from "../_shared/supabase.ts";
import { verifyLineIdToken } from "../_shared/line.ts";

interface Payload {
  idToken?: string;
  action?: "list" | "add" | "remove";
  shopId?: string;
}

Deno.serve(async (req: Request) => {
  const preflight = handlePreflight(req);
  if (preflight) return preflight;
  if (req.method !== "POST") {
    return jsonResponse({ error: "method not allowed" }, { status: 405 });
  }

  const channelId = Deno.env.get("LINE_CHANNEL_ID");
  if (!channelId) {
    return jsonResponse({ error: "LINE_CHANNEL_ID not set" }, { status: 500 });
  }

  let body: Payload = {};
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "invalid json" }, { status: 400 });
  }

  if (!body.idToken || !body.action) {
    return jsonResponse(
      { error: "idToken and action required" },
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
  const { data: customer } = await supa
    .from("customers")
    .select("id")
    .eq("line_user_id", claims.sub)
    .maybeSingle();

  if (!customer) {
    if (body.action === "list") {
      return jsonResponse({ ok: true, favorites: [] });
    }
    return jsonResponse({ error: "customer not found" }, { status: 404 });
  }

  if (body.action === "list") {
    const { data, error } = await supa
      .from("favorites")
      .select(
        "id, created_at, shop:shops(id, slug, name, city, district, cover_image_url, pet_types, status)",
      )
      .eq("customer_id", customer.id)
      .order("created_at", { ascending: false });
    if (error) return jsonResponse({ error: error.message }, { status: 500 });
    return jsonResponse({ ok: true, favorites: data ?? [] });
  }

  if (!body.shopId) {
    return jsonResponse({ error: "shopId required" }, { status: 400 });
  }

  if (body.action === "add") {
    const { error } = await supa.from("favorites").upsert(
      {
        customer_id: customer.id,
        shop_id: body.shopId,
      },
      { onConflict: "customer_id,shop_id" },
    );
    if (error) return jsonResponse({ error: error.message }, { status: 500 });
    return jsonResponse({ ok: true });
  }

  if (body.action === "remove") {
    const { error } = await supa
      .from("favorites")
      .delete()
      .eq("customer_id", customer.id)
      .eq("shop_id", body.shopId);
    if (error) return jsonResponse({ error: error.message }, { status: 500 });
    return jsonResponse({ ok: true });
  }

  return jsonResponse({ error: "unknown action" }, { status: 400 });
});
