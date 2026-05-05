import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Hotel,
  PawPrint,
  ShieldCheck,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { Spinner } from "@/components/Spinner";
import { PLATFORM_NAME } from "@/lib/constants";
import { emptyFilters, useShopSearch } from "@/web/hooks/useShopSearch";
import { ShopSearchPanel } from "@/web/components/ShopSearchPanel";
import { ShopCard } from "@/web/components/ShopCard";
import { useSiteSetting } from "@/lib/useSiteSetting";

export function HomePage() {
  const [filters, setFilters] = useState(emptyFilters);
  const { shops, loading } = useShopSearch(filters);
  const featured = shops.slice(0, 8);
  const { value: heroImageUrl } = useSiteSetting("home_hero_image_url");

  return (
    <div>
      {/* ====== Hero + 搜尋條 ====== */}
      <section
        className="relative overflow-hidden bg-gradient-to-br from-brand-600 via-brand-700 to-brand-800 bg-cover bg-center text-white"
        style={
          heroImageUrl
            ? { backgroundImage: `url(${heroImageUrl})` }
            : undefined
        }
      >
        {/* 點點紋理（無圖時才顯示） */}
        {!heroImageUrl && (
          <div className="absolute inset-0 opacity-10 [background-image:radial-gradient(circle_at_25%_30%,white_1px,transparent_1px)] [background-size:32px_32px]" />
        )}
        {/* 有圖時加一層深色蒙版確保白字可讀 */}
        {heroImageUrl && (
          <div className="absolute inset-0 bg-gradient-to-br from-brand-900/70 via-brand-800/55 to-brand-900/65" />
        )}

        <div className="relative mx-auto max-w-6xl px-4 pb-28 pt-12 sm:pb-32 sm:pt-20">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-100">
            {PLATFORM_NAME} · 寵物住宿訂房平台
          </p>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-5xl">
            為毛孩，找到下一個家
          </h1>
          <p className="mt-4 max-w-xl text-sm text-brand-50/90 sm:text-base">
            整合全台合作寵物旅館，一鍵預約、Email 通知、加入官方 LINE
            即可追蹤所有訂單，純 Web 體驗、不用下載 App。
          </p>
        </div>

        {/* 搜尋條浮在 hero 下緣 — 比原本再向下 12px，讓底部明顯超出 hero */}
        <div className="relative z-10 mx-auto -mt-9 max-w-6xl px-4 sm:-mt-11">
          <ShopSearchPanel filters={filters} onChange={setFilters} />
        </div>
      </section>

      {/* ====== 推薦商家 ====== */}
      <section className="mx-auto max-w-6xl px-4 pt-10 sm:pt-14">
        <div className="mb-5 flex items-end justify-between">
          <div>
            <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-price-600">
              <TrendingUp className="h-3.5 w-3.5" />
              熱門精選
            </p>
            <h2 className="mt-1 text-2xl font-bold text-slate-900">
              合作寵物旅館
            </h2>
          </div>
          <Link
            to="/shops"
            className="inline-flex items-center gap-1 text-sm font-semibold text-brand-700 hover:underline"
          >
            看全部
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Spinner />
          </div>
        ) : featured.length === 0 ? (
          <div className="card p-10 text-center text-sm text-slate-500">
            還沒有上架商家，敬請期待。
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {featured.map((s) => (
              <ShopCard key={s.id} shop={s} />
            ))}
          </div>
        )}
      </section>

      {/* ====== 三大特色 ====== */}
      <section className="mt-14 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-14">
          <h2 className="mb-8 text-center text-2xl font-bold text-slate-900">
            為什麼選擇 {PLATFORM_NAME}
          </h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <Feature
              icon={Hotel}
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

          <div className="mt-10 flex flex-col items-center gap-3">
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
  icon: typeof PawPrint;
  title: string;
  desc: string;
}) {
  return (
    <div className="card p-6">
      <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="text-base font-semibold text-slate-900">{title}</h3>
      <p className="mt-1.5 text-sm text-slate-600">{desc}</p>
    </div>
  );
}
