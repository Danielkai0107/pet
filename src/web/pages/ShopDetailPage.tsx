import { Link, useParams } from "react-router-dom";
import { Bed, MapPin, Phone, ArrowRight, PawPrint } from "lucide-react";
import { Spinner } from "@/components/Spinner";
import { Badge } from "@/components/Badge";
import { EmptyState } from "@/components/EmptyState";
import { fmtMoney } from "@/lib/format";
import { PET_SIZE_LABEL, PET_TYPE_LABEL } from "@/lib/constants";
import type { PetType } from "@/lib/types";
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

  return (
    <div>
      {/* Hero */}
      <section className="bg-gradient-to-br from-brand-50 to-white">
        <div className="mx-auto max-w-5xl px-4 py-10 sm:py-14">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
                {shop.name}
              </h1>
              <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-slate-600">
                {(shop.city || shop.district) && (
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    {[shop.city, shop.district].filter(Boolean).join(" ")}
                  </span>
                )}
                {shop.contact_phone && (
                  <span className="inline-flex items-center gap-1">
                    <Phone className="h-4 w-4" />
                    {shop.contact_phone}
                  </span>
                )}
                <div className="flex items-center gap-1">
                  {shop.pet_types.map((p) => (
                    <Badge key={p} className="bg-brand-50 text-brand-700">
                      {PET_TYPE_LABEL[p as PetType]}
                    </Badge>
                  ))}
                </div>
              </div>
              {shop.description && (
                <p className="mt-4 max-w-2xl whitespace-pre-line text-base text-slate-600">
                  {shop.description}
                </p>
              )}
            </div>

            <div className="flex items-center gap-2 self-start">
              <FavoriteButton shopId={shop.id} />
              <Link to={bookHref} className="btn-primary">
                立即預約
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-10">
        <h2 className="mb-4 text-lg font-bold text-slate-900">提供的房型</h2>

        {rooms.length === 0 ? (
          <div className="card">
            <EmptyState icon={Bed} title="店家尚未上架房型" />
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {rooms.map((r) => (
              <div key={r.id} className="card flex flex-col p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                      <Bed className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900">{r.name}</h3>
                      <p className="text-xs text-slate-500">
                        共 {r.total_count} 間
                      </p>
                    </div>
                  </div>
                  <p className="text-right">
                    <span className="text-lg font-bold text-brand-700">
                      {fmtMoney(r.price_per_night)}
                    </span>
                    <span className="text-xs text-slate-500"> / 晚</span>
                  </p>
                </div>
                {r.description && (
                  <p className="mt-3 line-clamp-2 text-sm text-slate-600">
                    {r.description}
                  </p>
                )}
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {r.pet_types.map((p) => (
                    <Badge key={p} className="bg-slate-100 text-slate-700">
                      {PET_TYPE_LABEL[p as PetType]}
                    </Badge>
                  ))}
                  {r.pet_sizes.map((s) => (
                    <Badge key={s} className="bg-slate-100 text-slate-700">
                      {PET_SIZE_LABEL.default[s]}
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-8 flex justify-center">
          <Link to={bookHref} className="btn-primary">
            選擇日期與房型開始預約
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}
