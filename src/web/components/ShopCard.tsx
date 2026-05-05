import { Link } from "react-router-dom";
import { MapPin, PawPrint, Star } from "lucide-react";
import { fmtMoney } from "@/lib/format";
import { PET_TYPE_LABEL } from "@/lib/constants";
import type { PetType, ShopSearchResult } from "@/lib/types";

interface Props {
  shop: ShopSearchResult;
  /** Path prefix — defaults to `/shop`. LIFF version uses `/liff/shop`. */
  prefix?: string;
}

/**
 * Trip.com 風酒店卡：
 * - 4:3 cover 圖佔上半，圖左上角放熱門/Hot badge、右上角放收藏圖標
 * - 下半文字區：店名 (粗體) → 地點 → 寵物類型 tags
 * - 右下角放大字粗體價格，對應「NT$ 1,200 起 / 晚」的訊息層級
 * - 整張卡 hover 微浮起 (shadow-card-hover)
 */
export function ShopCard({ shop, prefix = "/shop" }: Props) {
  return (
    <Link
      to={`${prefix}/${shop.slug}`}
      className="card-elevated group flex h-full flex-col overflow-hidden"
    >
      <div
        className="relative aspect-[4/3] w-full overflow-hidden bg-gradient-to-br from-brand-100 to-amber-100 bg-cover bg-center"
        style={
          shop.cover_image_url
            ? { backgroundImage: `url(${shop.cover_image_url})` }
            : undefined
        }
      >
        {!shop.cover_image_url && (
          <div className="flex h-full items-center justify-center text-brand-700">
            <PawPrint className="h-12 w-12 opacity-40" />
          </div>
        )}
        {/* TODO: 連到 ratings 後改成評分 + 評論數 */}
        <span className="img-overlay-top">
          <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
          4.8
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-1.5 p-3.5">
        <h3 className="line-clamp-1 text-[15px] font-bold text-slate-900 group-hover:text-brand-700">
          {shop.name}
        </h3>
        {(shop.city || shop.district) && (
          <p className="flex items-center gap-1 text-xs text-slate-500">
            <MapPin className="h-3 w-3 shrink-0" />
            <span className="truncate">
              {[shop.city, shop.district].filter(Boolean).join(" · ")}
            </span>
          </p>
        )}

        <div className="flex flex-wrap gap-1">
          {shop.pet_types.slice(0, 3).map((p) => (
            <span key={p} className="tag">
              {PET_TYPE_LABEL[p as PetType]}
            </span>
          ))}
        </div>

        <div className="mt-auto flex items-end justify-between pt-2">
          {shop.min_price !== null ? (
            <div className="flex items-baseline gap-0.5">
              <span className="text-[11px] text-slate-500">每晚</span>
              <span className="price-md leading-none">
                {fmtMoney(shop.min_price).replace("NT$ ", "")}
              </span>
              <span className="text-[11px] text-slate-500">起</span>
            </div>
          ) : (
            <span className="text-xs text-slate-400">尚無房型</span>
          )}
          <span className="text-xs font-semibold text-brand-700 group-hover:translate-x-0.5 transition-transform">
            查看 →
          </span>
        </div>
      </div>
    </Link>
  );
}
