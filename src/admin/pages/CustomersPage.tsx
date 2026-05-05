import { useEffect, useMemo, useState } from "react";
import { Search, Users } from "lucide-react";
import toast from "react-hot-toast";
import { Spinner } from "@/components/Spinner";
import { EmptyState } from "@/components/EmptyState";
import { fmtDateTime } from "@/lib/format";
import { supabase, formatSupabaseError } from "@/lib/supabase";
import type { Customer } from "@/lib/types";

export function AdminCustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("customers")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);
      if (cancelled) return;
      if (error) {
        toast.error(formatSupabaseError(error));
        setCustomers([]);
      } else {
        setCustomers((data ?? []) as Customer[]);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    const k = keyword.trim().toLowerCase();
    if (!k) return customers;
    return customers.filter(
      (c) =>
        (c.email ?? "").toLowerCase().includes(k) ||
        (c.phone ?? "").includes(k) ||
        (c.display_name ?? "").toLowerCase().includes(k),
    );
  }, [customers, keyword]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <header className="mb-5">
        <h1 className="text-2xl font-bold tracking-tight text-neutral-900">
          消費者
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          所有透過 Web 預約或加入 LINE 的消費者。
        </p>
      </header>

      <div className="mb-4">
        <div className="relative max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <input
            className="input pl-10"
            placeholder="搜尋姓名 / Email / 手機"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-card border border-neutral-200 bg-white">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Spinner />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={Users} title="尚無消費者" />
        ) : (
          <ul className="divide-y divide-neutral-100">
            {filtered.map((c) => (
              <li
                key={c.id}
                className="flex items-center gap-3 p-4 transition-colors hover:bg-neutral-50"
              >
                <div
                  className="h-10 w-10 shrink-0 rounded-full bg-neutral-100 bg-cover bg-center"
                  style={
                    c.picture_url
                      ? { backgroundImage: `url(${c.picture_url})` }
                      : undefined
                  }
                />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-neutral-900">
                    {c.display_name ?? "—"}
                  </p>
                  <p className="text-xs text-neutral-500">
                    {c.email ?? "—"}
                    {c.phone && <span className="ml-2">{c.phone}</span>}
                  </p>
                </div>
                {c.line_user_id && (
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-neutral-700">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    已綁 LINE
                  </span>
                )}
                <span className="text-xs text-neutral-400">
                  {fmtDateTime(c.created_at)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
