import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Sliders } from "lucide-react";
import { Spinner } from "@/components/Spinner";
import { ImageUploader } from "@/components/ImageUploader";
import { supabase, formatSupabaseError } from "@/lib/supabase";

interface Setting {
  key: string;
  value: string | null;
}

const HERO_KEY = "home_hero_image_url";

export function AdminSiteSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [heroUrl, setHeroUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("site_settings")
        .select("key,value")
        .eq("key", HERO_KEY)
        .maybeSingle<Setting>();
      if (cancelled) return;
      if (error) {
        toast.error(formatSupabaseError(error));
      } else {
        setHeroUrl(data?.value ?? null);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const persist = async (url: string | null) => {
    setHeroUrl(url);
    const { error } = await supabase
      .from("site_settings")
      .upsert({ key: HERO_KEY, value: url }, { onConflict: "key" });
    if (error) {
      toast.error(formatSupabaseError(error));
      return;
    }
    toast.success(url ? "已更新首頁 hero" : "已移除首頁 hero");
  };

  return (
    <div className="mx-auto max-w-3xl p-6 sm:p-10">
      <div className="mb-6 flex items-start gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-rose-50 text-rose-700">
          <Sliders className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">站台設定</h1>
          <p className="mt-1 text-sm text-slate-500">
            首頁 hero、品牌資料等全站性的呈現設定。
          </p>
        </div>
      </div>

      <section className="card p-6">
        <h2 className="text-base font-semibold text-slate-900">
          首頁 Hero 背景圖
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          建議寬度 ≥ 1920px、比例約 21:9 / 16:9。會顯示為公開首頁頂端的大圖
          banner，留白時則使用預設的 teal 漸層。
        </p>

        <div className="mt-4">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Spinner />
            </div>
          ) : (
            <ImageUploader
              mode="single"
              value={heroUrl}
              onChange={(url) => void persist(url)}
              pathPrefix="_site/home-hero"
              bucket="shop-images"
              aspectRatio="21/9"
              maxWidthOrHeight={2400}
              maxSizeMB={2}
            />
          )}
        </div>
      </section>
    </div>
  );
}
