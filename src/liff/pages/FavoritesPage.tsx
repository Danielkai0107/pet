import { Link } from "react-router-dom";
import { Heart, MapPin, X } from "lucide-react";
import toast from "react-hot-toast";
import { Spinner } from "@/components/Spinner";
import { Badge } from "@/components/Badge";
import { EmptyState } from "@/components/EmptyState";
import { PET_TYPE_LABEL } from "@/lib/constants";
import type { PetType } from "@/lib/types";
import { LiffGate } from "@/liff/components/LiffGate";
import { useFavorites } from "@/liff/hooks/useFavorites";

function FavoritesContent() {
  const { favorites, loading, remove } = useFavorites();

  return (
    <div className="px-4 py-5">
      <h1 className="text-xl font-bold text-slate-900">我的收藏</h1>

      {loading ? (
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      ) : favorites.length === 0 ? (
        <div className="card mt-4">
          <EmptyState
            icon={Heart}
            title="尚未收藏任何旅館"
            description="在商家頁點愛心即可加入收藏。"
            action={
              <Link to="/liff/discover" className="btn-primary">
                去找旅館
              </Link>
            }
          />
        </div>
      ) : (
        <ul className="mt-4 space-y-3">
          {favorites.map((f) =>
            f.shop ? (
              <li key={f.id} className="card">
                <Link
                  to={`/shop/${f.shop.slug}`}
                  className="flex items-start gap-3 p-3"
                >
                  <div
                    className="h-16 w-16 shrink-0 rounded-xl bg-slate-100 bg-cover bg-center"
                    style={
                      f.shop.cover_image_url
                        ? { backgroundImage: `url(${f.shop.cover_image_url})` }
                        : undefined
                    }
                  />
                  <div className="flex-1 min-w-0">
                    <h3 className="truncate font-semibold text-slate-900">
                      {f.shop.name}
                    </h3>
                    {(f.shop.city || f.shop.district) && (
                      <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-500">
                        <MapPin className="h-3 w-3" />
                        {[f.shop.city, f.shop.district].filter(Boolean).join(" ")}
                      </p>
                    )}
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {f.shop.pet_types.map((p) => (
                        <Badge key={p} className="bg-slate-100 text-slate-700">
                          {PET_TYPE_LABEL[p as PetType]}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <button
                    onClick={async (e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      const err = await remove(f.shop!.id);
                      if (err) {
                        toast.error("移除失敗");
                      } else {
                        toast.success("已移除");
                      }
                    }}
                    className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-rose-600"
                    aria-label="移除收藏"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </Link>
              </li>
            ) : null,
          )}
        </ul>
      )}
    </div>
  );
}

export function LiffFavoritesPage() {
  return (
    <LiffGate>
      <FavoritesContent />
    </LiffGate>
  );
}
