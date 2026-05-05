// Edge Function: push-line
// Push a text message to a specific customer (by customer_id) on the
// platform's LINE OA. Used for booking-status updates.

import { handlePreflight, jsonResponse } from "../_shared/cors.ts";
import { adminClient } from "../_shared/supabase.ts";
import { pushLineText } from "../_shared/line.ts";

interface PushPayload {
  customerId?: string;
  text?: string;
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

  let body: PushPayload = {};
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "invalid json" }, { status: 400 });
  }

  if (!body.customerId || !body.text) {
    return jsonResponse(
      { error: "customerId and text required" },
      { status: 400 },
    );
  }

  const supa = adminClient();
  const { data: customer } = await supa
    .from("customers")
    .select("line_user_id")
    .eq("id", body.customerId)
    .maybeSingle();

  if (!customer?.line_user_id) {
    return jsonResponse({ error: "customer has no LINE user id" }, { status: 404 });
  }

  try {
    await pushLineText({
      to: customer.line_user_id,
      text: body.text,
      channelAccessToken,
    });
  } catch (e) {
    return jsonResponse(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 502 },
    );
  }

  await supa.from("notifications").insert({
    customer_id: body.customerId,
    channel: "line",
    kind: "booking_confirmed",
    to_address: customer.line_user_id,
    content: body.text,
    status: "sent",
    sent_at: new Date().toISOString(),
  });

  return jsonResponse({ ok: true });
});
