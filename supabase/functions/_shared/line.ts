// Shared LINE helpers for Edge Functions.

const LINE_VERIFY_URL = "https://api.line.me/oauth2/v2.1/verify";
const LINE_PROFILE_URL = "https://api.line.me/v2/profile";

export interface LineIdTokenClaims {
  iss: string;
  sub: string; // user id
  aud: string;
  exp: number;
  iat: number;
  name?: string;
  picture?: string;
  email?: string;
}

/**
 * Verify a LINE id_token via LINE's verify endpoint.
 * Throws if invalid; returns claims if valid.
 */
export async function verifyLineIdToken(
  idToken: string,
  channelId: string,
): Promise<LineIdTokenClaims> {
  const body = new URLSearchParams({
    id_token: idToken,
    client_id: channelId,
  });
  const res = await fetch(LINE_VERIFY_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) {
    throw new Error(`line verify failed: ${res.status} ${await res.text()}`);
  }
  return (await res.json()) as LineIdTokenClaims;
}

/** Verify a LINE access token by calling the profile endpoint. */
export async function fetchLineProfile(accessToken: string): Promise<{
  userId: string;
  displayName: string;
  pictureUrl?: string;
  statusMessage?: string;
}> {
  const res = await fetch(LINE_PROFILE_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    throw new Error(`line profile failed: ${res.status}`);
  }
  return await res.json();
}

/** Push a text message to a LINE user. */
export async function pushLineText(opts: {
  to: string;
  text: string;
  channelAccessToken: string;
}) {
  const res = await fetch("https://api.line.me/v2/bot/message/push", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${opts.channelAccessToken}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      to: opts.to,
      messages: [{ type: "text", text: opts.text }],
    }),
  });
  if (!res.ok) {
    throw new Error(`line push failed: ${res.status} ${await res.text()}`);
  }
}

/** Push a Flex message bubble (or carousel) to a LINE user. */
export async function pushLineFlex(opts: {
  to: string;
  altText: string;
  bubble: Record<string, unknown>;
  channelAccessToken: string;
}) {
  const res = await fetch("https://api.line.me/v2/bot/message/push", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${opts.channelAccessToken}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      to: opts.to,
      messages: [
        {
          type: "flex",
          altText: opts.altText,
          contents: opts.bubble,
        },
      ],
    }),
  });
  if (!res.ok) {
    throw new Error(`line flex push failed: ${res.status} ${await res.text()}`);
  }
}

/** Reply to a LINE webhook event. */
export async function replyLineText(opts: {
  replyToken: string;
  text: string;
  channelAccessToken: string;
}) {
  const res = await fetch("https://api.line.me/v2/bot/message/reply", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${opts.channelAccessToken}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      replyToken: opts.replyToken,
      messages: [{ type: "text", text: opts.text }],
    }),
  });
  if (!res.ok) {
    throw new Error(`line reply failed: ${res.status} ${await res.text()}`);
  }
}

/** Verify x-line-signature on inbound webhook. */
export async function verifyLineSignature(
  body: string,
  signature: string | null,
  channelSecret: string,
): Promise<boolean> {
  if (!signature) return false;
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(channelSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(body));
  const expected = btoa(String.fromCharCode(...new Uint8Array(sig)));
  return expected === signature;
}
