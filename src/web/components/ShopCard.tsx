import { Link } from "react-router-dom";
import { MapPin, PawPrint } from "lucide-react";
import { Badge } from "@/components/Badge";
import { fmtMoney } from "@/lib/format";
import { PET_TYPE_LABEL } from "@/lib/constants";
import type { PetType, ShopSearchResult } from "@/lib/types";

interface Props {
  shop: ShopSearchResult;
  /** Path prefix — defaults to `/shop`. LIFF version uses `/liff/shop`. */
  prefix?: string;
}

export function ShopCard({ shop, prefix = "/shop" }: Props) {
  return (
    <Link
      to={`${prefix}/${shop.slug}`}
      className="card group flex h-full flex-col overflow-hidden transition-all hover:shadow-md"
    >
      <div
        className="aspect-[16/9] w-full bg-gradient-to-br from-brand-100 to-amber-100 bg-cover bg-center"
        style={
          shop.cover_image_url
            ? { backgroundImage: `url(${shop.cover_image_url})` }
            : undefined
        }
      >
        {!shop.cover_image_url && (
          <div className="flex h-full items-center justify-center text-brand-700">
            <PawPrint className="h-10 w-10 opacity-50" />
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col p-4">
        <h3 className="line-clamp-1 text-base font-bold text-slate-900 group-hover:text-brand-700">
          {shop.name}
        </h3>
        {(shop.city || shop.district) && (
          <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-500">
            <MapPin className="h-3.5 w-3.5" />
            {[shop.city, shop.district].filter(Boolean).join(" ")}
          </p>
        )}
        <div className="mt-2 flex flex-wrap gap-1">
          {shop.pet_types.map((p) => (
            <Badge key={p} className="bg-slate-100 text-slate-700">
              {PET_TYPE_LABEL[p as PetType]}
            </Badge>
          ))}
        </div>
        <div className="mt-3 flex items-end justify-between">
          {shop.min_price !== null ? (
            <p className="text-xs text-slate-500">
              每晚<span className="ml-1 text-base font-bold text-brand-700">
                {fmtMoney(shop.min_price)}
              </span>{" "}
              起
            </p>
          ) : (
            <span className="text-xs text-slate-400">尚無房型</span>
          )}
          <span className="text-xs font-medium text-brand-700 group-hover:translate-x-0.5">
            查看 →
          </span>
        </div>
      </div>
    </Link>
  );
}
