import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Users } from "lucide-react";
import { Spinner } from "@/components/Spinner";
import { Badge } from "@/components/Badge";
import { EmptyState } from "@/components/EmptyState";
import { supabase, formatSupabaseError } from "@/lib/supabase";
import type { ShopMember } from "@/lib/types";
import { useShopAuth } from "@/shop/auth/useShopAuth";
import { PageHeader } from "@/shop/components/PageHeader";

export function ShopStaffPage() {
  const { shop, member } = useShopAuth();
  const [members, setMembers] = useState<ShopMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!shop) return;
      setLoading(true);
      const { data, error } = await supabase
        .from("shop_members")
        .select("*")
        .eq("shop_id", shop.id)
        .order("created_at", { ascending: true });
      if (cancelled) return;
      setLoading(false);
      if (error) {
        toast.error(formatSupabaseError(error));
        return;
      }
      setMembers((data ?? []) as ShopMember[]);
    })();
    return () => {
      cancelled = true;
    };
  }, [shop]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <PageHeader
        title="員工管理"
        description="這個商家的所有員工。Phase F 將擴充為邀請制。"
      />

      <div className="card">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Spinner />
          </div>
        ) : members.length === 0 ? (
          <EmptyState icon={Users} title="尚無員工" />
        ) : (
          <ul className="divide-y divide-slate-100">
            {members.map((m) => (
              <li key={m.id} className="flex items-center justify-between p-4">
                <div>
                  <p className="font-medium text-slate-900">
                    {m.display_name ?? "—"}
                    {m.user_id === member?.user_id && (
                      <span className="ml-2 text-xs text-slate-500">（您）</span>
                    )}
                  </p>
                  <p className="text-xs text-slate-500">user id: {m.user_id.slice(0, 8)}…</p>
                </div>
                <Badge
                  className={
                    m.role === "owner"
                      ? "bg-brand-50 text-brand-700"
                      : "bg-slate-100 text-slate-700"
                  }
                >
                  {m.role === "owner" ? "店主" : "員工"}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
