import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

/**
 * 取單一個 site_settings KV — 透過 SECURITY DEFINER RPC，所以匿名也能呼叫。
 * 會 cache 在 sessionStorage 中以避免每次 hard reload 都打一次 API。
 */
export function useSiteSetting(key: string): {
  value: string | null;
  loading: boolean;
} {
  const cacheKey = `siteSetting:${key}`;
  const [value, setValue] = useState<string | null>(() => {
    try {
      return sessionStorage.getItem(cacheKey);
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(value === null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const { data, error } = await supabase.rpc("get_site_setting", {
        p_key: key,
      });
      if (cancelled) return;
      if (!error) {
        const v = (data as string | null) ?? null;
        setValue(v);
        try {
          if (v) sessionStorage.setItem(cacheKey, v);
          else sessionStorage.removeItem(cacheKey);
        } catch {
          // ignore (e.g. private mode)
        }
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [key, cacheKey]);

  return { value, loading };
}
