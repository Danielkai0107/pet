import { Link, useParams } from "react-router-dom";
import {
  ArrowRight,
  Bed,
  MapPin,
  PawPrint,
  Phone,
  ShieldCheck,
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
import { useServiceFeatures } from "@/lib/useServiceFeatures";
import { getFeatureIcon } from "@/lib/featureIcon";

/**
 * Airbnb 風房源詳情頁：
 *   - 圖片：mobile 為單張 16:10 圖；desktop 為 1+4 圖牆排版（16px 間距）。
 *   - 資訊區無大色塊；標籤一律 outline tag、評分以 Star + 數字呈現。
 *   - 房型卡：左圖右文，價格黑色加粗，僅剩數量用小色點表示，沒有橘紅 hot pill。
 *   - mobile 底部 sticky 預約 bar；desktop 用標題列右側 CTA。
 */
export function ShopDetailPage() {
  const { slug } = useParams();
  const { data, loading, error } = useShopBySlug(slug);
  const { features: allFeatures } = useServiceFeatures();
  const { isLiff, shopPrefix } = useRoutePrefix();
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

  const selectedFeatures = allFeatures.filter((f) =>
    (shop.service_feature_keys ?? []).includes(f.key),
  );

  const cover = shop.cover_image_url;

  // 上方「回首頁」連結 — 小字灰色，導向搜尋首頁。
  // LIFF 內回到 /liff/discover，公開站回到 /shops。
  const homeHref = isLiff ? "/liff/discover" : "/shops";

  return (
    <div className="bg-white pb-28 sm:pb-12">
      <div
        className={
          "mx-auto max-w-5xl px-4 pt-3 sm:pt-5" +
          (isLiff ? " pt-[max(env(safe-area-inset-top),12px)]" : "")
        }
      >
        <Link to={homeHref} className="btn-secondary">
          返回
        </Link>
      </div>
      <div className="mx-auto max-w-5xl px-4 pt-3 sm:pt-4">
        {/* Hero 圖牆：desktop 1 大圖 + 4 小圖；mobile 單張 16:10。
            標題改放在圖片下方，讓頂部畫面只有「回首頁 + 圖片」更乾淨。 */}
        <div className="grid gap-2 sm:grid-cols-4 sm:grid-rows-2">
          <div className="relative aspect-[16/10] overflow-hidden rounded-card bg-neutral-100 sm:col-span-2 sm:row-span-2 sm:aspect-auto">
            {cover ? (
              <img
                src={cover}
                alt={shop.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-neutral-300">
                <PawPrint className="h-16 w-16" />
              </div>
            )}
          </div>
          {/* desktop only：4 個小圖佔位 — 先用同 cover 重複顯示，未來接 photo_urls */}
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="relative hidden aspect-[4/3] overflow-hidden rounded-card bg-neutral-100 sm:block"
            >
              {cover ? (
                <img
                  src={cover}
                  alt=""
                  aria-hidden="true"
                  className="h-full w-full object-cover opacity-90"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-neutral-300">
                  <PawPrint className="h-8 w-8" />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* 主要內容 + 浮動預訂卡 */}
        <div className="mt-6 grid gap-10 sm:mt-8 sm:grid-cols-[1fr,360px]">
          <div className="min-w-0">
            {/* 標題 + 評分 + 收藏（Airbnb 風：放在 Hero 之下） */}
            <section>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <h1 className="text-2xl font-bold tracking-tight text-neutral-900 sm:text-3xl">
                    {shop.name}
                  </h1>
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-neutral-700">
                    <span className="inline-flex items-center gap-1">
                      <Star className="h-4 w-4 fill-neutral-900 text-neutral-900" />
                      <strong>4.8</strong>
                    </span>
                    {(shop.city || shop.district) && (
                      <>
                        <span className="text-neutral-300">·</span>
                        <span className="inline-flex items-center gap-1 text-neutral-700">
                          <MapPin className="h-4 w-4" />
                          {[shop.city, shop.district]
                            .filter(Boolean)
                            .join(" ")}
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <div className="shrink-0">
                  <FavoriteButton shopId={shop.id} />
                </div>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                {shop.pet_types.map((p) => (
                  <span key={p} className="tag-outline">
                    {PET_TYPE_LABEL[p as PetType]}
                  </span>
                ))}
                <span className="tag-outline">
                  <ShieldCheck className="h-3 w-3" />
                  平台合作店家
                </span>
              </div>
              {shop.contact_phone && (
                <a
                  href={`tel:${shop.contact_phone}`}
                  className="mt-3 inline-flex items-center gap-1.5 text-sm text-neutral-700 hover:underline"
                >
                  <Phone className="h-4 w-4" />
                  {shop.contact_phone}
                </a>
              )}
              {shop.description && (
                <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-neutral-700">
                  {shop.description}
                </p>
              )}
            </section>

            {selectedFeatures.length > 0 && (
              <section className="mt-10 border-t border-neutral-200 pt-8">
                <h2 className="text-lg font-semibold text-neutral-900">
                  服務特色
                </h2>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {selectedFeatures.map((f) => (
                    <FeatureChip
                      key={f.id}
                      icon={getFeatureIcon(f.icon)}
                      text={f.label}
                      description={f.description}
                    />
                  ))}
                </div>
                <p className="mt-3 text-[11px] text-neutral-400">
                  * 實際服務內容以店家現場提供為準
                </p>
              </section>
            )}

            <section className="mt-10 border-t border-neutral-200 pt-8">
              <div className="mb-4 flex items-end justify-between">
                <h2 className="text-lg font-semibold text-neutral-900">
                  提供的房型
                </h2>
                <span className="text-xs text-neutral-500">
                  {rooms.length} 種房型
                </span>
              </div>
              {rooms.length === 0 ? (
                <div className="rounded-card border border-neutral-200">
                  <EmptyState icon={Bed} title="店家尚未上架房型" />
                </div>
              ) : (
                <div className="space-y-3">
                  {rooms.map((r) => (
                    <RoomCard key={r.id} room={r} bookHref={bookHref} />
                  ))}
                </div>
              )}
            </section>
          </div>

          {/* desktop only：sticky 預訂卡 */}
          <aside className="hidden sm:block">
            <div className="sticky top-24 rounded-card border border-neutral-200 p-6">
              {minPrice !== null ? (
                <p className="text-neutral-900">
                  <span className="text-2xl font-bold">
                    {fmtMoney(minPrice)}
                  </span>
                  <span className="ml-1 text-sm text-neutral-500">/ 晚起</span>
                </p>
              ) : (
                <p className="text-sm text-neutral-500">目前尚無房型</p>
              )}
              <Link
                to={bookHref}
                className="btn-primary mt-5 w-full justify-center"
              >
                選擇日期 預約
                <ArrowRight className="h-4 w-4" />
              </Link>
              <p className="mt-3 text-center text-xs text-neutral-500">
                送出後店家會盡快確認
              </p>
            </div>
          </aside>
        </div>
      </div>

      {/* mobile sticky bottom 預約 bar：
          參考 Airbnb mobile：左側價格大、底色帶下劃線；右側按鈕僅佔需要寬度。 */}
      <div className="sticky-bottom-bar sm:hidden">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 leading-none">
            {minPrice !== null ? (
              <>
                <p className="text-xl font-bold text-neutral-900 underline decoration-neutral-900 underline-offset-4">
                  {fmtMoney(minPrice)}
                </p>
                <p className="mt-1.5 text-[11px] text-neutral-500">/ 晚起</p>
              </>
            ) : (
              <span className="text-xs text-neutral-500">尚無房型</span>
            )}
          </div>
          <Link to={bookHref} className="btn-primary shrink-0 px-6">
            預訂
          </Link>
        </div>
      </div>
    </div>
  );
}

function FeatureChip({
  icon: Icon,
  text,
  description,
}: {
  icon: typeof PawPrint;
  text: string;
  description?: string | null;
}) {
  return (
    <div className="flex items-start gap-3 text-sm text-neutral-700">
      <Icon className="mt-0.5 h-5 w-5 shrink-0 text-neutral-700" />
      <div className="min-w-0">
        <p className="font-medium text-neutral-900">{text}</p>
        {description && (
          <p className="mt-0.5 line-clamp-2 text-xs text-neutral-500">
            {description}
          </p>
        )}
      </div>
    </div>
  );
}

function RoomCard({ room, bookHref }: { room: Room; bookHref: string }) {
  const lowStock = room.total_count > 0 && room.total_count <= 3;
  return (
    <article className="overflow-hidden rounded-card border border-neutral-200 bg-white transition-shadow hover:shadow-md">
      <div className="flex flex-col gap-4 p-4 sm:flex-row">
        <div className="relative aspect-video shrink-0 overflow-hidden rounded-xl bg-neutral-100 sm:aspect-[4/3] sm:w-48">
          {room.photo_urls?.[0] ? (
            <img
              src={room.photo_urls[0]}
              alt={room.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-neutral-300">
              <Bed className="h-10 w-10" />
            </div>
          )}
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h3 className="text-base font-semibold text-neutral-900">
                {room.name}
              </h3>
              <p className="mt-0.5 text-xs text-neutral-500">
                共 {room.total_count} 間
                {lowStock && (
                  <span className="ml-2 inline-flex items-center gap-1 text-neutral-700">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                    僅剩 {room.total_count} 間
                  </span>
                )}
              </p>
            </div>
            <div className="text-right leading-none">
              <p className="text-lg font-bold text-neutral-900">
                {fmtMoney(room.price_per_night)}
              </p>
              <p className="mt-0.5 text-[11px] text-neutral-500">/ 晚</p>
            </div>
          </div>

          {room.description && (
            <p className="mt-2 line-clamp-2 text-sm text-neutral-600">
              {room.description}
            </p>
          )}

          <div className="mt-2 flex flex-wrap gap-1">
            {room.pet_types.map((p) => (
              <span key={p} className="tag-outline">
                {PET_TYPE_LABEL[p as PetType]}
              </span>
            ))}
            {room.pet_sizes.map((s) => (
              <span key={s} className="tag-outline">
                {PET_SIZE_LABEL.default[s]}
              </span>
            ))}
          </div>

          <div className="mt-3 flex items-center justify-end">
            <Link to={bookHref} className="btn-secondary text-xs">
              選擇此房型
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}
