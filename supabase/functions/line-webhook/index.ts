// Edge Function: line-webhook
//
// Receives LINE webhook events from the platform's official LINE OA.
//
// follow event:
//   - upsert customer row (by line_user_id)
//   - reply with welcome + 「請在此輸入手機號碼以快速綁定」
//
// message text:
//   1. If customer has an unexpired pending_bind_phone:
//      - "確認" / "yes" / "y" → finalise bind:
//          * link line_user_id to the customers row that owns the phone
//          * backfill bookings.customer_id (where guest_phone normalises to phone)
//          * reply count of bookings linked
//      - "取消" / "cancel" / "n" → clear pending_bind, reply
//      - anything else → re-prompt
//   2. Else if message looks like a TW phone number:
//      - lookup customers by normalised phone
//      - if no match (no booking ever made with that phone) → friendly "no record"
//      - if matched + already bound to a *different* line_user_id → reject
//      - else → set pending_bind_*, reply "要綁定 0912-XXX-678 嗎？回覆「確認」即可"
//   3. Else → reply menu / help text
//
// unfollow:
//   - clear last_active_at + pending_bind state
//
// Notes:
//   - We never SMS-OTP; the trust model assumes the staff invited the
//     user in person, hence the lightweight text-confirmation handshake.

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

const PENDING_TTL_MS = 5 * 60 * 1000; // 5 min

function normalizePhone(p: string): string {
  return p.replace(/[\s\-()]/g, "").replace(/^\+886/, "0");
}

/** Loose TW mobile / landline matcher — accepts 09XXXXXXXX, 0XXXXXXXXX,
 *  with spaces / dashes / +886 prefix. */
function looksLikePhone(raw: string): boolean {
  const digits = normalizePhone(raw);
  if (!/^\d+$/.test(digits)) return false;
  return digits.length >= 9 && digits.length <= 10;
}

function maskPhone(p: string): string {
  const d = normalizePhone(p);
  if (d.length === 10 && d.startsWith("09")) {
    return `${d.slice(0, 4)}-${d.slice(4, 7).replace(/./g, "X")}-${d.slice(7)}`;
  }
  if (d.length >= 7) {
    return `${d.slice(0, 3)}***${d.slice(-3)}`;
  }
  return p;
}

function isConfirm(text: string): boolean {
  const t = text.trim().toLowerCase();
  return ["確認", "yes", "y", "ok", "好"].includes(t);
}

function isCancel(text: string): boolean {
  const t = text.trim().toLowerCase();
  return ["取消", "cancel", "no", "n"].includes(t);
}

function welcomeText(platformName: string): string {
  return (
    `🐾 歡迎加入 ${platformName}！\n\n` +
    `【快速綁定】\n` +
    `請直接在這裡輸入您的手機號碼（例如 0912345678），\n` +
    `系統會幫您把過去與未來的訂單通通連結到此 LINE，` +
    `店家報平安、預約通知都會直接送到您的聊天室。\n\n` +
    `也可從下方圖文選單操作：\n` +
    `• 我的訂單\n• 找寵物旅館`
  );
}

function helpText(): string {
  return (
    `若要綁定訂單，請直接傳手機號碼（例如 0912345678）。\n\n` +
    `也可使用下方圖文選單：\n` +
    `• 我的訂單\n• 歷史紀錄\n• 找寵物旅館\n• 我的資料`
  );
}

Deno.serve(async (req: Request) => {
  const preflight = handlePreflight(req);
  if (preflight) return preflight;
  if (req.method !== "POST") {
    return jsonResponse({ error: "method not allowed" }, { status: 405 });
  }

  const channelSecret = Deno.env.get("LINE_CHANNEL_SECRET");
  const channelAccessToken = Deno.env.get("LINE_CHANNEL_ACCESS_TOKEN");
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
    if (!userId) continue;

    try {
      if (ev.type === "follow") {
        await supa.from("customers").upsert(
          {
            line_user_id: userId,
            last_active_at: new Date().toISOString(),
          },
          { onConflict: "line_user_id" },
        );

        if (ev.replyToken && channelAccessToken) {
          await replyLineText({
            replyToken: ev.replyToken,
            channelAccessToken,
            text: welcomeText(platformName),
          });
        }
      } else if (ev.type === "unfollow") {
        await supa
          .from("customers")
          .update({
            last_active_at: null,
            pending_bind_phone: null,
            pending_bind_expires_at: null,
          })
          .eq("line_user_id", userId);
      } else if (
        ev.type === "message" &&
        ev.message?.type === "text" &&
        ev.replyToken &&
        channelAccessToken
      ) {
        const text = (ev.message.text ?? "").trim();
        await handleMessage({
          supa,
          userId,
          text,
          replyToken: ev.replyToken,
          channelAccessToken,
          platformName,
        });
      }
    } catch (e) {
      console.warn("[line-webhook] event handler failed", e);
    }
  }

  return jsonResponse({ ok: true });
});

interface HandleMessageOpts {
  // deno-lint-ignore no-explicit-any
  supa: any;
  userId: string;
  text: string;
  replyToken: string;
  channelAccessToken: string;
  platformName: string;
}

async function handleMessage(opts: HandleMessageOpts) {
  const { supa, userId, text, replyToken, channelAccessToken, platformName } =
    opts;

  // Ensure self-customer row exists (covers users who messaged before
  // follow event, or whose follow event was lost).
  const { data: selfBefore } = await supa
    .from("customers")
    .select("id, line_user_id, pending_bind_phone, pending_bind_expires_at")
    .eq("line_user_id", userId)
    .maybeSingle();

  let self = selfBefore;
  if (!self) {
    const { data: created } = await supa
      .from("customers")
      .insert({ line_user_id: userId })
      .select("id, line_user_id, pending_bind_phone, pending_bind_expires_at")
      .single();
    self = created;
  }
  if (!self) {
    await replyLineText({
      replyToken,
      channelAccessToken,
      text: "系統暫時無法處理，請稍後再試。",
    });
    return;
  }

  // Has unexpired pending_bind?
  const pendingPhone: string | null = self.pending_bind_phone ?? null;
  const pendingExp = self.pending_bind_expires_at
    ? new Date(self.pending_bind_expires_at).getTime()
    : 0;
  const hasPending = !!pendingPhone && pendingExp > Date.now();

  if (hasPending && pendingPhone) {
    if (isConfirm(text)) {
      await finaliseBind({
        supa,
        userId,
        selfId: self.id,
        phone: pendingPhone,
        replyToken,
        channelAccessToken,
        platformName,
      });
      return;
    }
    if (isCancel(text)) {
      await supa
        .from("customers")
        .update({
          pending_bind_phone: null,
          pending_bind_expires_at: null,
        })
        .eq("id", self.id);
      await replyLineText({
        replyToken,
        channelAccessToken,
        text: "已取消綁定。如需綁定請直接重新傳送手機號碼。",
      });
      return;
    }
    // Message arrived during pending — if it's another phone, treat as
    // restart (peek with the new number); otherwise re-prompt.
    if (looksLikePhone(text)) {
      await peekPhone({
        supa,
        selfId: self.id,
        rawPhone: text,
        replyToken,
        channelAccessToken,
      });
      return;
    }
    await replyLineText({
      replyToken,
      channelAccessToken,
      text: `要綁定 ${maskPhone(pendingPhone)} 嗎？回覆「確認」完成綁定，或回覆「取消」放棄。`,
    });
    return;
  }

  // No pending state.
  if (looksLikePhone(text)) {
    await peekPhone({
      supa,
      selfId: self.id,
      rawPhone: text,
      replyToken,
      channelAccessToken,
    });
    return;
  }

  await replyLineText({
    replyToken,
    channelAccessToken,
    text: helpText(),
  });
}

interface PeekOpts {
  // deno-lint-ignore no-explicit-any
  supa: any;
  selfId: string;
  rawPhone: string;
  replyToken: string;
  channelAccessToken: string;
}

async function peekPhone(opts: PeekOpts) {
  const { supa, selfId, rawPhone, replyToken, channelAccessToken } = opts;
  const phone = normalizePhone(rawPhone);

  // Look for a matching customers row OR matching booking — either is
  // enough to start the bind handshake.
  const { data: existingCustomer } = await supa
    .from("customers")
    .select("id, line_user_id")
    .eq("phone", phone)
    .maybeSingle();

  if (existingCustomer?.line_user_id && existingCustomer.id !== selfId) {
    // Someone else already owns this phone via LINE.
    await replyLineText({
      replyToken,
      channelAccessToken,
      text:
        `此手機號碼已被其他 LINE 帳號綁定。\n` +
        `若這是您本人的號碼，請先到原 LINE 帳號解除綁定後再試，或聯繫店家協助。`,
    });
    return;
  }

  if (!existingCustomer) {
    // Maybe there's a guest booking — check bookings table directly.
    const { count } = await supa
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .eq("guest_phone", phone);
    if ((count ?? 0) === 0) {
      await replyLineText({
        replyToken,
        channelAccessToken,
        text:
          `查無此手機號碼的訂單紀錄。\n` +
          `請確認號碼是否正確，或於完成首次預約後再試。`,
      });
      return;
    }
  }

  const expiresAt = new Date(Date.now() + PENDING_TTL_MS).toISOString();
  await supa
    .from("customers")
    .update({
      pending_bind_phone: phone,
      pending_bind_expires_at: expiresAt,
    })
    .eq("id", selfId);

  await replyLineText({
    replyToken,
    channelAccessToken,
    text:
      `要綁定 ${maskPhone(phone)} 嗎？\n` +
      `回覆「確認」即可完成；或回覆「取消」放棄。\n` +
      `（5 分鐘內未回覆會自動失效）`,
  });
}

interface FinaliseOpts {
  // deno-lint-ignore no-explicit-any
  supa: any;
  userId: string;
  selfId: string;
  phone: string;
  replyToken: string;
  channelAccessToken: string;
  platformName: string;
}

/**
 * Bind sequence:
 *   1. Find existing customers row that owns this phone (if any).
 *   2. If row exists and has different line_user_id → reject (race).
 *   3. If row exists and is this user (same id) → just update phone, clear pending.
 *   4. If row exists but no line_user_id → migrate the LINE bind: copy
 *      line_user_id onto that row, then delete the throwaway self row to
 *      avoid duplicate line_user_id collisions on the unique index.
 *   5. If row does not exist → simply update self with the phone.
 *   6. Backfill bookings.customer_id where guest_phone normalises to phone
 *      and customer_id is null.
 */
async function finaliseBind(opts: FinaliseOpts) {
  const {
    supa,
    userId,
    selfId,
    phone,
    replyToken,
    channelAccessToken,
    platformName,
  } = opts;

  const { data: target } = await supa
    .from("customers")
    .select("id, line_user_id")
    .eq("phone", phone)
    .maybeSingle();

  let finalCustomerId: string = selfId;

  if (target) {
    if (target.line_user_id && target.id !== selfId) {
      // Race: someone else bound between peek and confirm.
      await supa
        .from("customers")
        .update({
          pending_bind_phone: null,
          pending_bind_expires_at: null,
        })
        .eq("id", selfId);
      await replyLineText({
        replyToken,
        channelAccessToken,
        text:
          `綁定失敗：此手機號碼剛剛已被其他帳號綁定。\n` +
          `若這是您本人的號碼，請聯繫店家協助。`,
      });
      return;
    }

    if (target.id === selfId) {
      await supa
        .from("customers")
        .update({
          phone,
          pending_bind_phone: null,
          pending_bind_expires_at: null,
        })
        .eq("id", selfId);
      finalCustomerId = selfId;
    } else {
      // Merge: write our line_user_id onto the legacy target row, then
      // delete the throwaway self row that was created by follow event.
      // Order matters: clear self.line_user_id first to release the
      // unique constraint, then update target.
      await supa
        .from("customers")
        .update({
          line_user_id: null,
          pending_bind_phone: null,
          pending_bind_expires_at: null,
        })
        .eq("id", selfId);
      const { error: mergeErr } = await supa
        .from("customers")
        .update({ line_user_id: userId })
        .eq("id", target.id);
      if (mergeErr) {
        console.warn("[line-webhook] merge target failed", mergeErr);
        // Roll back self's line_user_id so they can retry.
        await supa
          .from("customers")
          .update({ line_user_id: userId })
          .eq("id", selfId);
        await replyLineText({
          replyToken,
          channelAccessToken,
          text: "綁定失敗，請稍後再試或聯繫店家。",
        });
        return;
      }
      // Drop the throwaway self row.
      await supa.from("customers").delete().eq("id", selfId);
      finalCustomerId = target.id;
    }
  } else {
    // No existing customers row — simplest path: write phone onto self.
    await supa
      .from("customers")
      .update({
        phone,
        pending_bind_phone: null,
        pending_bind_expires_at: null,
      })
      .eq("id", selfId);
    finalCustomerId = selfId;
  }

  // Backfill bookings.customer_id for unowned matches.
  const { count: linkedCount } = await supa
    .from("bookings")
    .update({ customer_id: finalCustomerId }, { count: "exact" })
    .eq("guest_phone", phone)
    .is("customer_id", null);

  await replyLineText({
    replyToken,
    channelAccessToken,
    text:
      `🎉 綁定成功！\n` +
      `已將 ${linkedCount ?? 0} 筆訂單連結至此 LINE。\n\n` +
      `往後 ${platformName} 的店家報平安、預約通知都會直接送到這裡，\n` +
      `也可從下方圖文選單「我的訂單」查看。`,
  });
}
