import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, MapPin, ShieldCheck, Sparkles } from "lucide-react";
import { Spinner } from "@/components/Spinner";
import { PLATFORM_NAME } from "@/lib/constants";
import {
  emptyFilters,
  useShopSearch,
} from "@/web/hooks/useShopSearch";
import { ShopSearchPanel } from "@/web/components/ShopSearchPanel";
import { ShopCard } from "@/web/components/ShopCard";

export function HomePage() {
  const [filters, setFilters] = useState(emptyFilters);
  const { shops, loading } = useShopSearch(filters);
  const featured = shops.slice(0, 6);

  return (
    <div>
      <section className="bg-gradient-to-br from-brand-50 via-white to-amber-50">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:py-20">
          <div className="max-w-2xl">
            <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-brand-700">
              寵物旅館訂房
            </p>
            <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">
              為毛孩找到
              <br />
              <span className="text-brand-700">最安心的住宿</span>
            </h1>
            <p className="mt-5 text-base text-slate-600 sm:text-lg">
              {PLATFORM_NAME} 整合全台合作寵物旅館，
              一鍵預約、Email 通知、加入官方 LINE 即可追蹤所有訂單。
              不用下載 App，純 Web 體驗。
            </p>
          </div>

          <div className="mt-8">
            <ShopSearchPanel filters={filters} onChange={setFilters} />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14">
        <div className="mb-6 flex items-end justify-between">
          <h2 className="text-xl font-bold text-slate-900">合作寵物旅館</h2>
          <Link to="/shops" className="text-sm font-semibold text-brand-700 hover:underline">
            看全部 →
          </Link>
        </div>
        {loading ? (
          <div className="flex justify-center py-12">
            <Spinner />
          </div>
        ) : featured.length === 0 ? (
          <div className="card p-10 text-center text-sm text-slate-500">
            還沒有上架商家，敬請期待。
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((s) => (
              <ShopCard key={s.id} shop={s} />
            ))}
          </div>
        )}
      </section>

      <section className="bg-slate-50">
        <div className="mx-auto max-w-6xl px-4 py-14">
          <div className="grid gap-6 sm:grid-cols-3">
            <Feature
              icon={MapPin}
              title="全台精選旅館"
              desc="精挑細選的合作店家，每家都需通過審核才能上架。"
            />
            <Feature
              icon={Sparkles}
              title="3 步驟完成預約"
              desc="選日期 → 選房型 → 填寵物資訊，全程不到 2 分鐘。"
            />
            <Feature
              icon={ShieldCheck}
              title="LINE 跨店追蹤"
              desc="加入平台官方 LINE，一個帳號管理所有訂單與歷史紀錄。"
            />
          </div>

          <div className="mt-10 flex flex-col items-center gap-2">
            <Link to="/shops" className="btn-primary">
              開始找寵物旅館
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/shop/onboarding"
              className="text-sm text-slate-500 hover:text-brand-700"
            >
              我是寵物旅館業者，想加入合作 →
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

function Feature({
  icon: Icon,
  title,
  desc,
}: {
  icon: typeof MapPin;
  title: string;
  desc: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="text-base font-semibold text-slate-900">{title}</h3>
      <p className="mt-1.5 text-sm text-slate-600">{desc}</p>
    </div>
  );
}
