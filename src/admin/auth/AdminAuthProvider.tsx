import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import type { Admin } from "@/lib/types";
import { AdminAuthCtx, type AdminAuthState } from "./AdminAuthContext";

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [loading, setLoading] = useState(true);
  const [ready, setReady] = useState(false);

  const loadAdmin = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from("admins")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) {
      console.warn("[admin-auth] load admin failed", error);
      setAdmin(null);
      return;
    }
    setAdmin((data as Admin) ?? null);
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.auth.getSession();
    setSession(data.session);
    if (data.session?.user) {
      await loadAdmin(data.session.user.id);
    } else {
      setAdmin(null);
    }
    setLoading(false);
    setReady(true);
  }, [loadAdmin]);

  useEffect(() => {
    void refresh();
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      if (s?.user) void loadAdmin(s.user.id);
      else setAdmin(null);
    });
    return () => sub.subscription.unsubscribe();
  }, [refresh, loadAdmin]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const value = useMemo<AdminAuthState>(
    () => ({
      ready,
      loading,
      session,
      user: session?.user ?? null,
      admin,
      refresh,
      signOut,
    }),
    [ready, loading, session, admin, refresh, signOut],
  );

  return <AdminAuthCtx.Provider value={value}>{children}</AdminAuthCtx.Provider>;
}
