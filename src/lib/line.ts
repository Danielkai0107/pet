import liff from "@line/liff";
import { LIFF_ID } from "./constants";

let initPromise: Promise<typeof liff> | null = null;

export interface LiffProfile {
  userId: string;
  displayName: string;
  pictureUrl?: string;
  statusMessage?: string;
}

export interface LiffInitResult {
  ok: boolean;
  inLine: boolean;
  profile: LiffProfile | null;
  idToken: string | null;
  error?: string;
}

export async function ensureLiffReady(timeoutMs = 5000): Promise<typeof liff> {
  if (!LIFF_ID) {
    throw new Error("VITE_LIFF_ID 未設定");
  }
  if (!initPromise) {
    initPromise = (async () => {
      const timeout = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error("LIFF 初始化超時")), timeoutMs);
      });
      await Promise.race([liff.init({ liffId: LIFF_ID }), timeout]);
      return liff;
    })();
  }
  return initPromise;
}

export async function loadLiffProfile(): Promise<LiffInitResult> {
  try {
    const sdk = await ensureLiffReady();
    const inLine = sdk.isInClient();
    if (!sdk.isLoggedIn()) {
      return { ok: true, inLine, profile: null, idToken: null };
    }
    const profile = await sdk.getProfile();
    const idToken = sdk.getIDToken();
    return {
      ok: true,
      inLine,
      profile: {
        userId: profile.userId,
        displayName: profile.displayName,
        pictureUrl: profile.pictureUrl,
        statusMessage: profile.statusMessage,
      },
      idToken,
    };
  } catch (e) {
    return {
      ok: false,
      inLine: false,
      profile: null,
      idToken: null,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

export async function loginWithLine(redirectUri?: string): Promise<void> {
  const sdk = await ensureLiffReady();
  if (!sdk.isLoggedIn()) {
    sdk.login({ redirectUri });
  }
}

export async function logoutFromLine(): Promise<void> {
  const sdk = await ensureLiffReady();
  if (sdk.isLoggedIn()) {
    sdk.logout();
  }
}

export function isInLine(): boolean {
  try {
    return liff.isInClient();
  } catch {
    return false;
  }
}
