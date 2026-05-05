import { useEffect, useState } from "react";
import { CreditCard } from "lucide-react";
import { Spinner } from "@/components/Spinner";
import { Badge } from "@/components/Badge";
import { fmtDateTime } from "@/lib/format";
import { supabase } from "@/lib/supabase";
import { useShopAuth } from "@/shop/auth/useShopAuth";
import { PageHeader } from "@/shop/components/PageHeader";

interface Subscription {
  id: string;
  plan: "trial" | "basic" | "pro";
  starts_at: string;
  expires_at: string;
  auto_renew: boolean;
}

const PLAN_LABEL = { trial: "試用", basic: "基本版", pro: "進階版" } as const;

export function ShopBillingPage() {
  const { shop } = useShopAuth();
  const [sub, setSub] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!shop) return;
      setLoading(true);
      const { data } = await supabase
        .from("shop_subscriptions")
        .select("*")
        .eq("shop_id", shop.id)
        .maybeSingle();
      if (cancelled) return;
      setSub((data as Subscription) ?? null);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [shop]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <PageHeader
        title="訂閱方案"
        description="您目前的方案與到期時間"
      />

      <div className="card p-6">
        {loading ? (
          <div className="flex justify-center py-6">
            <Spinner />
          </div>
        ) : !sub ? (
          <div className="flex items-center gap-3 text-slate-600">
            <CreditCard className="h-5 w-5" />
            尚未指派訂閱方案，請聯繫平台管理員開通。
          </div>
        ) : (
          <SubscriptionDetails sub={sub} />
        )}
      </div>
    </div>
  );
}

function SubscriptionDetails({ sub }: { sub: Subscription }) {
  const expired = new Date(sub.expires_at).getTime() < Date.now();
  return (
    <dl className="space-y-3 text-sm">
      <Row label="方案">
        <Badge className="bg-brand-50 text-brand-700">
          {PLAN_LABEL[sub.plan]}
        </Badge>
      </Row>
      <Row label="開始時間">{fmtDateTime(sub.starts_at)}</Row>
      <Row label="到期時間">
        <span
          className={
            expired ? "font-bold text-rose-600" : "font-bold text-slate-900"
          }
        >
          {fmtDateTime(sub.expires_at)}
          {expired && <span className="ml-2 text-xs">（已過期）</span>}
        </span>
      </Row>
      <Row label="自動續訂">{sub.auto_renew ? "是" : "否"}</Row>
    </dl>
  );
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-4 border-b border-slate-100 pb-2 last:border-0">
      <span className="w-24 shrink-0 text-slate-500">{label}</span>
      <span className="flex-1 text-slate-900">{children}</span>
    </div>
  );
}
