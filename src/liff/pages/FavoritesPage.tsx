import { Link } from "react-router-dom";
import { Heart, MapPin, X } from "lucide-react";
import toast from "react-hot-toast";
import { Spinner } from "@/components/Spinner";
import { EmptyState } from "@/components/EmptyState";
import { useManagedOptions } from "@/lib/managedOptions";
import { LiffGate } from "@/liff/components/LiffGate";
import { LiffHeader } from "@/liff/components/LiffHeader";
import { useFavorites } from "@/liff/hooks/useFavorites";

function FavoritesContent() {
  const { favorites, loading, remove } = useFavorites();
  const { petTypeLabel } = useManagedOptions();

  return (
    <div className="bg-white pb-12">
      <LiffHeader title="我的收藏" description="收藏中的合作旅館" />

      <div className="px-4 pt-4">
        {loading ? (
          <div className="flex justify-center py-12">
            <Spinner />
          </div>
        ) : favorites.length === 0 ? (
          <div className="rounded-card border border-neutral-200">
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
          <ul className="space-y-3">
            {favorites.map((f) =>
              f.shop ? (
                <li
                  key={f.id}
                  className="rounded-card border border-neutral-200 bg-white"
                >
                  <Link
                    to={`/liff/shop/${f.shop.slug}`}
                    className="flex items-start gap-3 p-3"
                  >
                    <div
                      className="h-16 w-16 shrink-0 rounded-xl bg-neutral-100 bg-cover bg-center"
                      style={
                        f.shop.cover_image_url
                          ? {
                              backgroundImage: `url(${f.shop.cover_image_url})`,
                            }
                          : undefined
                      }
                    />
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate font-semibold text-neutral-900">
                        {f.shop.name}
                      </h3>
                      {(f.shop.city || f.shop.district) && (
                        <p className="mt-0.5 flex items-center gap-1 text-xs text-neutral-500">
                          <MapPin className="h-3 w-3" />
                          {[f.shop.city, f.shop.district]
                            .filter(Boolean)
                            .join(" ")}
                        </p>
                      )}
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {f.shop.pet_types.map((p) => (
                          <span key={p} className="tag-outline">
                            {petTypeLabel(p)}
                          </span>
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
                      className="rounded-full p-2 text-neutral-400 hover:bg-neutral-100 hover:text-rose-600"
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
