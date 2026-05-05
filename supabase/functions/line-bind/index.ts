// Edge Function: line-bind
// Two-step Email OTP that links a LINE user_id to existing bookings via
// the verified email address.
//
// step=request_otp  -> {idToken, email}      => email a 6-digit code
// step=verify_otp   -> {idToken, email, code} => bind line_user_id to customer
//                                                 + backfill bookings.customer_id

import { handlePreflight, jsonResponse } from "../_shared/cors.ts";
import { adminClient } from "../_shared/supabase.ts";
import { verifyLineIdToken } from "../_shared/line.ts";

interface Payload {
  step?: "request_otp" | "verify_otp";
  idToken?: string;
  email?: string;
  code?: string;
}

const RESEND_ENDPOINT = "https://api.resend.com/emails";
const OTP_TTL_MS = 5 * 60 * 1000; // 5 min
const MAX_ATTEMPTS = 3;

async function sha256(input: string) {
  const enc = new TextEncoder();
  const buf = await crypto.subtle.digest("SHA-256", enc.encode(input));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function newCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

async function sendOtpEmail(email: string, code: string): Promise<void> {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  if (!apiKey) {
    console.log(`[line-bind] (dev) OTP for ${email} = ${code}`);
    return;
  }
  const fromAddr =
    Deno.env.get("EMAIL_FROM") ?? "PetStay <noreply@example.com>";
  const res = await fetch(RESEND_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      from: fromAddr,
      to: [email],
      subject: `PetStay 綁定驗證碼：${code}`,
      text: `您的綁定驗證碼是：${code}\n\n此驗證碼 5 分鐘內有效。\n\n若您沒有要求此驗證碼，請忽略此信。`,
    }),
  });
  if (!res.ok) throw new Error(`resend failed: ${res.status}`);
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

  if (!body.idToken || !body.email || !body.step) {
    return jsonResponse(
      { error: "idToken, email, and step are required" },
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
  const email = body.email.trim().toLowerCase();

  if (body.step === "request_otp") {
    const code = newCode();
    const codeHash = await sha256(code);
    const expiresAt = new Date(Date.now() + OTP_TTL_MS).toISOString();
    // Invalidate prior unconsumed codes for the same email.
    await supa
      .from("email_otps")
      .update({ consumed: true })
      .eq("email", email)
      .eq("consumed", false);
    const { error: insErr } = await supa.from("email_otps").insert({
      email,
      code_hash: codeHash,
      expires_at: expiresAt,
    });
    if (insErr) return jsonResponse({ error: insErr.message }, { status: 500 });

    try {
      await sendOtpEmail(email, code);
    } catch (e) {
      return jsonResponse(
        {
          error: "failed to send OTP",
          detail: e instanceof Error ? e.message : String(e),
        },
        { status: 502 },
      );
    }

    return jsonResponse({ ok: true });
  }

  // verify_otp
  if (!body.code) {
    return jsonResponse({ error: "code required" }, { status: 400 });
  }
  const codeHash = await sha256(body.code.trim());
  const { data: otp } = await supa
    .from("email_otps")
    .select("*")
    .eq("email", email)
    .eq("consumed", false)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!otp || new Date(otp.expires_at).getTime() < Date.now()) {
    return jsonResponse(
      { error: "驗證碼已過期，請重新申請" },
      { status: 400 },
    );
  }
  if (otp.attempts >= MAX_ATTEMPTS) {
    return jsonResponse(
      { error: "嘗試次數過多，請重新申請" },
      { status: 400 },
    );
  }
  if (otp.code_hash !== codeHash) {
    await supa
      .from("email_otps")
      .update({ attempts: otp.attempts + 1 })
      .eq("id", otp.id);
    return jsonResponse({ error: "驗證碼錯誤" }, { status: 400 });
  }

  // mark consumed
  await supa.from("email_otps").update({ consumed: true }).eq("id", otp.id);

  // Find or create customer for this line_user_id, set email + display_name.
  const { data: existing } = await supa
    .from("customers")
    .select("id, email")
    .eq("line_user_id", claims.sub)
    .maybeSingle();

  let customerId: string;
  if (existing) {
    await supa
      .from("customers")
      .update({
        email,
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
        display_name: claims.name ?? null,
        picture_url: claims.picture ?? null,
      })
      .select("id")
      .single();
    if (cErr) return jsonResponse({ error: cErr.message }, { status: 500 });
    customerId = created.id;
  }

  // Backfill bookings: any booking whose guest_email matches and has no
  // customer_id gets attached to this customer.
  const { error: backErr } = await supa
    .from("bookings")
    .update({ customer_id: customerId })
    .eq("guest_email", email)
    .is("customer_id", null);
  if (backErr) {
    return jsonResponse({ error: backErr.message }, { status: 500 });
  }

  return jsonResponse({ ok: true, customerId });
});
