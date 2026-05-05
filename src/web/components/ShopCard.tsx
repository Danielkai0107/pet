import { Link } from "react-router-dom";
import { PawPrint, Star } from "lucide-react";
import { fmtMoney } from "@/lib/format";
import { useManagedOptions } from "@/lib/managedOptions";
import type { ShopSearchResult } from "@/lib/types";

interface Props {
  shop: ShopSearchResult;
  /** Path prefix — defaults to `/shop`. LIFF version uses `/liff/shop`. */
  prefix?: string;
}

/**
 * Airbnb 風房源卡：
 *   - 4:3 圖片，圓角 16px，圖片是視覺主體（無漸層底色）。
 *   - 文字區無背景：標題（黑粗體）、評分（圖右上小白底膠囊）、地點（小灰）。
 *   - 寵物類型用細邊 outline tag，最多顯示 2 個。
 *   - 價格大字黑色加粗 + /晚 灰字。
 */
export function ShopCard({ shop, prefix = "/shop" }: Props) {
  const { petTypeLabel } = useManagedOptions();
  return (
    <Link
      to={`${prefix}/${shop.slug}`}
      className="group block focus:outline-none"
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-card bg-neutral-100">
        {shop.cover_image_url ? (
          <img
            src={shop.cover_image_url}
            alt={shop.name}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-neutral-300">
            <PawPrint className="h-12 w-12" />
          </div>
        )}
        {/* TODO: 連到 ratings 後改成評分 + 評論數 */}
        <span className="img-overlay-top">
          <Star className="h-3 w-3 fill-neutral-900 text-neutral-900" />
          4.8
        </span>
      </div>

      <div className="px-1 pt-3">
        <div className="flex items-start justify-between gap-3">
          <h3 className="line-clamp-1 text-[15px] font-semibold text-neutral-900">
            {shop.name}
          </h3>
        </div>
        {(shop.city || shop.district) && (
          <p className="mt-0.5 line-clamp-1 text-sm text-neutral-500">
            {[shop.city, shop.district].filter(Boolean).join(" · ")}
          </p>
        )}

        {shop.pet_types.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {shop.pet_types.slice(0, 3).map((p) => (
              <span key={p} className="tag-outline">
                {petTypeLabel(p)}
              </span>
            ))}
          </div>
        )}

        <p className="mt-1.5 text-sm text-neutral-900">
          {shop.min_price !== null ? (
            <>
              <span className="font-semibold underline decoration-neutral-300 underline-offset-2">
                {fmtMoney(shop.min_price)}
              </span>
              <span className="text-neutral-500"> / 晚起</span>
            </>
          ) : (
            <span className="text-neutral-400">尚無房型</span>
          )}
        </p>
      </div>
    </Link>
  );
}
