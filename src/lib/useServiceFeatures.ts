import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { ServiceFeature } from "@/lib/types";

interface Options {
  /** 預設 true：只回傳 is_active = true 的（公開頁與 shop multi-select 用）。
   *  Admin 管理頁傳 false 拿全部。 */
  activeOnly?: boolean;
}

/**
 * 全平台共用的「服務特色」清單。RLS 已開公開讀，所以 anon / authenticated
 * 都能查；讀取後 sortBy(sort_order) 並暴露 reload 給管理頁用。
 */
export function useServiceFeatures(opts: Options = {}) {
  const { activeOnly = true } = opts;
  const [features, setFeatures] = useState<ServiceFeature[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = async () => {
    setLoading(true);
    let q = supabase
      .from("service_features")
      .select("*")
      .order("sort_order", { ascending: true });
    if (activeOnly) q = q.eq("is_active", true);
    const { data, error } = await q;
    if (error) {
      setError(error.message);
      setFeatures([]);
    } else {
      setFeatures((data ?? []) as ServiceFeature[]);
      setError(null);
    }
    setLoading(false);
  };

  useEffect(() => {
    void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeOnly]);

  return { features, loading, error, reload };
}
