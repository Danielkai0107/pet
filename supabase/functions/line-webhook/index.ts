// Edge Function: line-webhook
// Receives LINE webhook events from the platform's official LINE OA.
// - follow event: upsert customer + send welcome with bind LIFF URL
// - message text: simple FAQ / inbox

import { handlePreflight, jsonResponse } from "../_shared/cors.ts";
import { adminClient } from "../_shared/supabase.ts";
import { replyLineText, verifyLineSignature } from "../_shared/line.ts";

interface LineEvent {
  type: string;
  source?: { userId?: string };
  replyToken?: string;
  message?: { type: string; text?: string };
}

interface LineWebhookBody {
  events?: LineEvent[];
}

Deno.serve(async (req: Request) => {
  const preflight = handlePreflight(req);
  if (preflight) return preflight;
  if (req.method !== "POST") {
    return jsonResponse({ error: "method not allowed" }, { status: 405 });
  }

  const channelSecret = Deno.env.get("LINE_CHANNEL_SECRET");
  const channelAccessToken = Deno.env.get("LINE_CHANNEL_ACCESS_TOKEN");
  const liffBindUrl =
    Deno.env.get("LIFF_BIND_URL") ?? "https://liff.line.me/your-liff-id/bind";
  const platformName = Deno.env.get("PLATFORM_NAME") ?? "PetStay";

  const raw = await req.text();
  if (channelSecret) {
    const ok = await verifyLineSignature(
      raw,
      req.headers.get("x-line-signature"),
      channelSecret,
    );
    if (!ok) {
      console.warn("[line-webhook] invalid signature");
      return jsonResponse({ ok: false, reason: "bad signature" }, { status: 401 });
    }
  }

  let body: LineWebhookBody = {};
  try {
    body = JSON.parse(raw);
  } catch {
    return jsonResponse({ ok: false }, { status: 400 });
  }

  const supa = adminClient();
  for (const ev of body.events ?? []) {
    const userId = ev.source?.userId;

    if (ev.type === "follow" && userId) {
      // Upsert customer (no email yet — that comes via OTP)
      await supa.from("customers").upsert(
        {
          line_user_id: userId,
          last_active_at: new Date().toISOString(),
        },
        { onConflict: "line_user_id" },
      );

      if (ev.replyToken && channelAccessToken) {
        try {
          await replyLineText({
            replyToken: ev.replyToken,
            channelAccessToken,
            text:
              `🐾 歡迎加入 ${platformName}！\n\n` +
              `綁定您的訂單後，可隨時在 LINE 內查看：\n${liffBindUrl}\n\n` +
              `也歡迎前往「找寵物旅館」探索更多店家。`,
          });
        } catch (e) {
          console.warn("[line-webhook] reply failed", e);
        }
      }
    } else if (ev.type === "unfollow" && userId) {
      await supa
        .from("customers")
        .update({ last_active_at: null })
        .eq("line_user_id", userId);
    } else if (
      ev.type === "message" &&
      ev.message?.type === "text" &&
      ev.replyToken &&
      channelAccessToken
    ) {
      try {
        await replyLineText({
          replyToken: ev.replyToken,
          channelAccessToken,
          text:
            "您好！請使用下方圖文選單操作：\n" +
            "• 我的訂單\n• 歷史紀錄\n• 找寵物旅館\n• 我的資料",
        });
      } catch (e) {
        console.warn("[line-webhook] reply failed", e);
      }
    }
  }

  return jsonResponse({ ok: true });
});
