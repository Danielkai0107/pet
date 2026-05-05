import { Link, useParams } from "react-router-dom";
import {
  ArrowRight,
  Bed,
  CheckCircle2,
  MapPin,
  PawPrint,
  Phone,
  ShieldCheck,
  Sparkles,
  Star,
} from "lucide-react";
import { Spinner } from "@/components/Spinner";
import { EmptyState } from "@/components/EmptyState";
import { fmtMoney } from "@/lib/format";
import { PET_SIZE_LABEL, PET_TYPE_LABEL } from "@/lib/constants";
import type { PetType, Room } from "@/lib/types";
import { useShopBySlug } from "@/web/hooks/useShopBySlug";
import { FavoriteButton } from "@/web/components/FavoriteButton";
import { useRoutePrefix } from "@/lib/useRoutePrefix";

export function ShopDetailPage() {
  const { slug } = useParams();
  const { data, loading, error } = useShopBySlug(slug);
  const { shopPrefix } = useRoutePrefix();
  const bookHref = `${shopPrefix}/${slug}/book`;

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="mx-auto max-w-md py-16">
        <EmptyState
          icon={PawPrint}
          title="找不到這家寵物旅館"
          description={error ?? "可能已下架或網址有誤。"}
          action={
            <Link to="/shops" className="btn-primary">
              看其他旅館
            </Link>
          }
        />
      </div>
    );
  }

  const { shop, rooms } = data;
  const minPrice = rooms.reduce<number | null>((min, r) => {
    if (min === null) return r.price_per_night;
    return Math.min(min, r.price_per_night);
  }, null);

  return (
    <div className="bg-slate-50 pb-32 sm:pb-16">
      {/* ====== Hero 圖 + 浮動價格卡（trip.com 風格：扁平 banner） ====== */}
      <section className="relative">
        <div
          className="aspect-[21/9] w-full bg-gradient-to-br from-brand-100 to-amber-100 bg-cover bg-center sm:aspect-[32/9]"
          style={
            shop.cover_image_url
              ? { backgroundImage: `url(${shop.cover_image_url})` }
              : undefined
          }
        >
          {!shop.cover_image_url && (
            <div className="flex h-full items-center justify-center text-brand-700">
              <PawPrint className="h-20 w-20 opacity-30" />
            </div>
          )}
        </div>
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/40 to-transparent" />
      </section>

      <div className="mx-auto max-w-5xl px-4 -mt-10 sm:-mt-14">
        {/* 標題卡 */}
        <div className="card relative overflow-hidden p-5 sm:p-7">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5">
                {shop.pet_types.map((p) => (
                  <span key={p} className="tag-brand">
                    {PET_TYPE_LABEL[p as PetType]}
                  </span>
                ))}
                <span className="tag-success">
                  <ShieldCheck className="h-3 w-3" />
                  平台合作店家
                </span>
              </div>

              <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
                {shop.name}
              </h1>

              <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-slate-600">
                <span className="inline-flex items-center gap-1">
                  <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                  <strong className="text-slate-900">4.8</strong>
                  <span className="text-slate-500">·</span>
                  <span className="text-slate-500">優質寵物旅館</span>
                </span>
                {(shop.city || shop.district) && (
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    {[shop.city, shop.district].filter(Boolean).join(" ")}
                  </span>
                )}
                {shop.contact_phone && (
                  <a
                    href={`tel:${shop.contact_phone}`}
                    className="inline-flex items-center gap-1 hover:text-brand-700"
                  >
                    <Phone className="h-4 w-4" />
                    {shop.contact_phone}
                  </a>
                )}
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2 sm:flex-col sm:items-end">
              <div className="hidden sm:block">
                {minPrice !== null ? (
                  <p className="text-right">
                    <span className="text-xs text-slate-500">每晚最低</span>
                    <br />
                    <span className="price-lg">
                      {fmtMoney(minPrice).replace("NT$ ", "")}
                    </span>
                    <span className="ml-0.5 text-xs text-slate-500">起</span>
                  </p>
                ) : null}
              </div>
              <div className="flex items-center gap-2">
                <FavoriteButton shopId={shop.id} />
                <Link to={bookHref} className="btn-cta hidden sm:inline-flex">
                  立即預約
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>

          {shop.description && (
            <p className="mt-4 whitespace-pre-line border-t border-slate-100 pt-4 text-sm text-slate-600">
              {shop.description}
            </p>
          )}
        </div>

        {/* ====== 服務 / 設施 chips（客戶易看） ====== */}
        <div className="card mt-4 p-5">
          <h2 className="mb-3 text-sm font-bold text-slate-900">服務特色</h2>
          <div className="grid gap-2 sm:grid-cols-2">
            <FeatureChip icon={ShieldCheck} text="合格獸醫合作 24h 緊急聯絡" />
            <FeatureChip icon={Sparkles} text="每日清潔消毒" />
            <FeatureChip icon={PawPrint} text="個別籠舍 / 隔離安排" />
            <FeatureChip icon={Bed} text="每日活動與互動" />
          </div>
          <p className="mt-3 text-[11px] text-slate-400">
            * 實際服務內容以店家現場提供為準
          </p>
        </div>

        {/* ====== 房型列表 ====== */}
        <div className="mt-4">
          <div className="mb-3 flex items-end justify-between">
            <h2 className="text-base font-bold text-slate-900">提供的房型</h2>
            <span className="text-xs text-slate-500">{rooms.length} 種房型</span>
          </div>

          {rooms.length === 0 ? (
            <div className="card">
              <EmptyState icon={Bed} title="店家尚未上架房型" />
            </div>
          ) : (
            <div className="space-y-3">
              {rooms.map((r) => (
                <RoomCard key={r.id} room={r} bookHref={bookHref} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ====== Mobile sticky bottom 預約 bar ====== */}
      <div className="sticky-bottom-bar sm:hidden">
        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-col leading-none">
            {minPrice !== null ? (
              <>
                <span className="text-[10px] text-slate-500">每晚</span>
                <span className="price-md">
                  {fmtMoney(minPrice).replace("NT$ ", "")}
                  <span className="ml-0.5 text-[10px] text-slate-500">起</span>
                </span>
              </>
            ) : (
              <span className="text-xs text-slate-500">尚無房型</span>
            )}
          </div>
          <Link to={bookHref} className="btn-cta flex-1 justify-center">
            選擇日期 預約
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}

function FeatureChip({
  icon: Icon,
  text,
}: {
  icon: typeof PawPrint;
  text: string;
}) {
  return (
    <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">
      <Icon className="h-4 w-4 shrink-0 text-brand-600" />
      <span>{text}</span>
    </div>
  );
}

function RoomCard({ room, bookHref }: { room: Room; bookHref: string }) {
  return (
    <article className="card overflow-hidden p-4 transition-shadow hover:shadow-card-hover">
      <div className="flex flex-col gap-4 sm:flex-row">
        {/* 圖佔位 */}
        <div className="relative aspect-video shrink-0 overflow-hidden rounded-lg bg-gradient-to-br from-brand-50 to-amber-50 sm:aspect-[4/3] sm:w-44">
          {room.photo_urls?.[0] ? (
            <img
              src={room.photo_urls[0]}
              alt={room.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-brand-600">
              <Bed className="h-10 w-10 opacity-40" />
            </div>
          )}
          {room.total_count > 0 && room.total_count <= 3 && (
            <span className="img-overlay-hot">
              <CheckCircle2 className="h-3 w-3" />
              僅剩 {room.total_count} 間
            </span>
          )}
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h3 className="font-bold text-slate-900">{room.name}</h3>
              <p className="mt-0.5 text-xs text-slate-500">
                共 {room.total_count} 間
              </p>
            </div>
            <div className="text-right">
              <p>
                <span className="price-sm">
                  {fmtMoney(room.price_per_night).replace("NT$ ", "")}
                </span>
                <span className="ml-0.5 text-[11px] text-slate-500">/晚</span>
              </p>
            </div>
          </div>

          {room.description && (
            <p className="mt-2 line-clamp-2 text-sm text-slate-600">
              {room.description}
            </p>
          )}

          <div className="mt-2 flex flex-wrap gap-1">
            {room.pet_types.map((p) => (
              <span key={p} className="tag">
                {PET_TYPE_LABEL[p as PetType]}
              </span>
            ))}
            {room.pet_sizes.map((s) => (
              <span key={s} className="tag">
                {PET_SIZE_LABEL.default[s]}
              </span>
            ))}
          </div>

          <div className="mt-3 flex items-center justify-end">
            <Link to={bookHref} className="btn-cta text-xs">
              選擇此房型
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}
