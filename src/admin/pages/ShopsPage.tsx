import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Pause, Play, Store, X, Search } from "lucide-react";
import toast from "react-hot-toast";
import { Spinner } from "@/components/Spinner";
import { EmptyState } from "@/components/EmptyState";
import { fmtDateTime } from "@/lib/format";
import { supabase, formatSupabaseError } from "@/lib/supabase";
import type { Shop, ShopStatus } from "@/lib/types";
import { cn } from "@/lib/cn";

const STATUS_LABEL: Record<ShopStatus, string> = {
  pending_review: "待審核",
  active: "上架中",
  suspended: "已暫停",
  rejected: "已拒絕",
};

const STATUS_DOT: Record<ShopStatus, string> = {
  pending_review: "bg-amber-500",
  active: "bg-emerald-500",
  suspended: "bg-neutral-400",
  rejected: "bg-rose-500",
};

const TABS: { key: ShopStatus | "all"; label: string }[] = [
  { key: "pending_review", label: "待審核" },
  { key: "active", label: "上架中" },
  { key: "suspended", label: "已暫停" },
  { key: "rejected", label: "已拒絕" },
  { key: "all", label: "全部" },
];

export function AdminShopsPage() {
  const [tab, setTab] = useState<ShopStatus | "all">("pending_review");
  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState("");

  const reload = async () => {
    setLoading(true);
    let q = supabase
      .from("shops")
      .select("*")
      .order("created_at", { ascending: false });
    if (tab !== "all") q = q.eq("status", tab);
    const { data, error } = await q;
    if (error) {
      toast.error(formatSupabaseError(error));
      setShops([]);
    } else {
      setShops((data ?? []) as Shop[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const filtered = useMemo(() => {
    const k = keyword.trim().toLowerCase();
    if (!k) return shops;
    return shops.filter(
      (s) =>
        s.name.toLowerCase().includes(k) ||
        s.slug.toLowerCase().includes(k) ||
        (s.contact_email ?? "").toLowerCase().includes(k),
    );
  }, [shops, keyword]);

  const updateStatus = async (shop: Shop, next: ShopStatus) => {
    if (!confirm(`將「${shop.name}」狀態更新為「${STATUS_LABEL[next]}」？`))
      return;
    const { error } = await supabase
      .from("shops")
      .update({ status: next })
      .eq("id", shop.id);
    if (error) {
      toast.error(formatSupabaseError(error));
      return;
    }
    toast.success("已更新");
    await reload();
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <header className="mb-5">
        <h1 className="text-2xl font-bold tracking-tight text-neutral-900">
          商家管理
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          審核新店家申請，並管理現有合作商家。
        </p>
      </header>

      <div className="mt-4 flex flex-col gap-3 border-b border-neutral-200">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={
                "tab-underline" + (tab === t.key ? " tab-underline-active" : "")
              }
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="relative pb-3 sm:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <input
            className="input pl-10"
            placeholder="搜尋店名 / slug / Email"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
          />
        </div>
      </div>

      <div className="mt-4 overflow-hidden rounded-card border border-neutral-200 bg-white">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Spinner />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={Store} title="尚無資料" />
        ) : (
          <ul className="divide-y divide-neutral-100">
            {filtered.map((s) => (
              <li
                key={s.id}
                className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-neutral-900">{s.name}</h3>
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-neutral-700">
                      <span
                        className={cn(
                          "h-1.5 w-1.5 rounded-full",
                          STATUS_DOT[s.status],
                        )}
                      />
                      {STATUS_LABEL[s.status]}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-neutral-500">
                    /{s.slug} · {s.city ?? "—"} {s.district ?? ""} ·{" "}
                    {s.contact_email ?? "—"}
                  </p>
                  <p className="mt-0.5 text-xs text-neutral-400">
                    建立於 {fmtDateTime(s.created_at)}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-1">
                  {s.status === "pending_review" && (
                    <>
                      <button
                        className="btn-primary"
                        onClick={() => updateStatus(s, "active")}
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        通過
                      </button>
                      <button
                        className="btn-secondary"
                        onClick={() => updateStatus(s, "rejected")}
                      >
                        <X className="h-4 w-4" />
                        拒絕
                      </button>
                    </>
                  )}
                  {s.status === "active" && (
                    <button
                      className="btn-ghost"
                      onClick={() => updateStatus(s, "suspended")}
                    >
                      <Pause className="h-4 w-4" />
                      暫停
                    </button>
                  )}
                  {(s.status === "suspended" || s.status === "rejected") && (
                    <button
                      className="btn-ghost"
                      onClick={() => updateStatus(s, "active")}
                    >
                      <Play className="h-4 w-4" />
                      啟用
                    </button>
                  )}
                  {s.status === "active" && (
                    <a
                      href={`/shop/${s.slug}`}
                      target="_blank"
                      rel="noreferrer"
                      className="btn-ghost text-sm"
                    >
                      查看公開頁
                    </a>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
