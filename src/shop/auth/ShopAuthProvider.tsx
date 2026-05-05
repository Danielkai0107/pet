import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import type { Shop, ShopMember } from "@/lib/types";
import { ShopAuthCtx, type ShopAuthState } from "./ShopAuthContext";

export function ShopAuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [member, setMember] = useState<ShopMember | null>(null);
  const [shop, setShop] = useState<Shop | null>(null);
  const [loading, setLoading] = useState(true);
  const [ready, setReady] = useState(false);

  const loadMembership = useCallback(async (userId: string) => {
    const { data: m, error: mErr } = await supabase
      .from("shop_members")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (mErr) {
      console.error("[ShopAuth] load member failed", mErr);
      setMember(null);
      setShop(null);
      return;
    }
    if (!m) {
      setMember(null);
      setShop(null);
      return;
    }
    setMember(m as ShopMember);

    const { data: s, error: sErr } = await supabase
      .from("shops")
      .select("*")
      .eq("id", m.shop_id)
      .maybeSingle();
    if (sErr) {
      console.error("[ShopAuth] load shop failed", sErr);
      setShop(null);
    } else {
      setShop((s as Shop) ?? null);
    }
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.auth.getSession();
    setSession(data.session);
    if (data.session?.user) {
      await loadMembership(data.session.user.id);
    } else {
      setMember(null);
      setShop(null);
    }
    setLoading(false);
    setReady(true);
  }, [loadMembership]);

  useEffect(() => {
    void refresh();
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      if (s?.user) {
        void loadMembership(s.user.id);
      } else {
        setMember(null);
        setShop(null);
      }
    });
    return () => sub.subscription.unsubscribe();
  }, [refresh, loadMembership]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const value = useMemo<ShopAuthState>(
    () => ({
      loading,
      ready,
      session,
      user: session?.user ?? null,
      member,
      shop,
      refresh,
      signOut,
    }),
    [loading, ready, session, member, shop, refresh, signOut],
  );

  return <ShopAuthCtx.Provider value={value}>{children}</ShopAuthCtx.Provider>;
}
