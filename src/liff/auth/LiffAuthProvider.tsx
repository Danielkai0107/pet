import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { LIFF_ID } from "@/lib/constants";
import { loadLiffProfile, loginWithLine } from "@/lib/line";
import type { LiffProfile } from "@/lib/line";
import { supabase } from "@/lib/supabase";
import type { Customer } from "@/lib/types";
import { LiffAuthCtx, type LiffAuthState } from "./LiffAuthContext";

export function LiffAuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [inLine, setInLine] = useState(false);
  const [profile, setProfile] = useState<LiffProfile | null>(null);
  const [idToken, setIdToken] = useState<string | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [error, setError] = useState<string | null>(null);

  const hasLiffId = !!LIFF_ID;

  const fetchCustomer = useCallback(async (token: string) => {
    try {
      const { data, error: invErr } = await supabase.functions.invoke(
        "line-me",
        { body: { idToken: token } },
      );
      if (invErr) throw invErr;
      const c = (data as { customer?: Customer })?.customer ?? null;
      setCustomer(c);
    } catch (e) {
      console.warn("[liff-auth] line-me failed", e);
      setCustomer(null);
    }
  }, []);

  const refresh = useCallback(async () => {
    setError(null);
    if (!hasLiffId) {
      setReady(true);
      return;
    }
    const result = await loadLiffProfile();
    setInLine(result.inLine);
    if (!result.ok) {
      setError(result.error ?? "LIFF 載入失敗");
      setReady(true);
      return;
    }
    setProfile(result.profile);
    setIdToken(result.idToken);
    if (result.idToken) {
      await fetchCustomer(result.idToken);
    } else {
      setCustomer(null);
    }
    setReady(true);
  }, [hasLiffId, fetchCustomer]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const login = useCallback(async () => {
    await loginWithLine();
  }, []);

  const value = useMemo<LiffAuthState>(
    () => ({
      ready,
      inLine,
      hasLiffId,
      loggedIn: !!profile,
      profile,
      idToken,
      customer,
      error,
      login,
      refresh,
    }),
    [ready, inLine, hasLiffId, profile, idToken, customer, error, login, refresh],
  );

  return <LiffAuthCtx.Provider value={value}>{children}</LiffAuthCtx.Provider>;
}
