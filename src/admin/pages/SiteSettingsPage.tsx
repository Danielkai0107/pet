import { useEffect, useState, type FormEvent } from "react";
import toast from "react-hot-toast";
import {
  ArrowDown,
  ArrowUp,
  Eye,
  EyeOff,
  Plus,
  Sliders,
  Trash2,
} from "lucide-react";
import { Spinner } from "@/components/Spinner";
import { ImageUploader } from "@/components/ImageUploader";
import { Modal } from "@/components/Modal";
import { supabase, formatSupabaseError } from "@/lib/supabase";
import {
  ICON_OPTIONS,
  getFeatureIcon,
} from "@/lib/featureIcon";
import { useServiceFeatures } from "@/lib/useServiceFeatures";
import type { ServiceFeature } from "@/lib/types";

interface Setting {
  key: string;
  value: string | null;
}

const HERO_KEY = "home_hero_image_url";

export function AdminSiteSettingsPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-8 p-6 sm:p-10">
      <header className="flex items-start gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-rose-50 text-rose-700">
          <Sliders className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">站台設定</h1>
          <p className="mt-1 text-sm text-slate-500">
            首頁 hero、服務特色清單等全站性的呈現設定。
          </p>
        </div>
      </header>

      <HeroImageSection />
      <ServiceFeaturesSection />
    </div>
  );
}

/* ───────────────────────── Hero image ───────────────────────── */

function HeroImageSection() {
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
      if (error) toast.error(formatSupabaseError(error));
      else setHeroUrl(data?.value ?? null);
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
    if (error) toast.error(formatSupabaseError(error));
    else toast.success(url ? "已更新首頁 hero" : "已移除首頁 hero");
  };

  return (
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
  );
}

/* ───────────────────────── Service features ───────────────────────── */

function ServiceFeaturesSection() {
  const { features, loading, reload } = useServiceFeatures({
    activeOnly: false,
  });
  const [editing, setEditing] = useState<ServiceFeature | null | "new">(null);

  const toggleActive = async (f: ServiceFeature) => {
    const { error } = await supabase
      .from("service_features")
      .update({ is_active: !f.is_active })
      .eq("id", f.id);
    if (error) toast.error(formatSupabaseError(error));
    else {
      toast.success(f.is_active ? "已停用" : "已啟用");
      await reload();
    }
  };

  const removeOne = async (f: ServiceFeature) => {
    if (
      !confirm(
        `確定要刪除「${f.label}」？已勾選此特色的店家會自動失去這個標籤。`,
      )
    )
      return;
    const { error } = await supabase
      .from("service_features")
      .delete()
      .eq("id", f.id);
    if (error) toast.error(formatSupabaseError(error));
    else {
      toast.success("已刪除");
      await reload();
    }
  };

  const move = async (f: ServiceFeature, dir: -1 | 1) => {
    // Swap sort_order with the neighbour in given direction
    const sorted = [...features].sort((a, b) => a.sort_order - b.sort_order);
    const i = sorted.findIndex((x) => x.id === f.id);
    const j = i + dir;
    if (j < 0 || j >= sorted.length) return;
    const a = sorted[i];
    const b = sorted[j];
    const { error } = await supabase.from("service_features").upsert([
      { id: a.id, sort_order: b.sort_order },
      { id: b.id, sort_order: a.sort_order },
    ]);
    if (error) toast.error(formatSupabaseError(error));
    else await reload();
  };

  return (
    <section className="card p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-900">
            服務特色清單
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            這份清單會出現在「商家後台 → 商家設定 → 服務特色」的勾選欄裡，
            並顯示在每個商家的公開頁。
          </p>
        </div>
        <button
          className="btn-primary shrink-0"
          onClick={() => setEditing("new")}
        >
          <Plus className="h-4 w-4" />
          新增特色
        </button>
      </div>

      <div className="mt-4 space-y-2">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Spinner />
          </div>
        ) : features.length === 0 ? (
          <p className="rounded-lg bg-slate-50 p-6 text-center text-sm text-slate-500">
            還沒有任何特色,點上方「新增特色」開始建立。
          </p>
        ) : (
          features.map((f, idx) => {
            const Icon = getFeatureIcon(f.icon);
            return (
              <div
                key={f.id}
                className="flex items-start gap-3 rounded-lg border border-slate-200 bg-white p-3"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                    {f.label}
                    {!f.is_active && (
                      <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] text-slate-700">
                        已停用
                      </span>
                    )}
                  </p>
                  {f.description && (
                    <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">
                      {f.description}
                    </p>
                  )}
                  <p className="mt-0.5 text-[10px] font-mono text-slate-400">
                    key: {f.key} · icon: {f.icon}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    className="btn-ghost"
                    onClick={() => move(f, -1)}
                    disabled={idx === 0}
                    title="上移"
                  >
                    <ArrowUp className="h-4 w-4" />
                  </button>
                  <button
                    className="btn-ghost"
                    onClick={() => move(f, 1)}
                    disabled={idx === features.length - 1}
                    title="下移"
                  >
                    <ArrowDown className="h-4 w-4" />
                  </button>
                  <button
                    className="btn-ghost"
                    onClick={() => toggleActive(f)}
                    title={f.is_active ? "停用" : "啟用"}
                  >
                    {f.is_active ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                  <button
                    className="btn-ghost"
                    onClick={() => setEditing(f)}
                    title="編輯"
                  >
                    編輯
                  </button>
                  <button
                    className="btn-ghost text-rose-600 hover:bg-rose-50"
                    onClick={() => removeOne(f)}
                    title="刪除"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {editing !== null && (
        <FeatureFormModal
          initial={editing === "new" ? null : editing}
          existingKeys={features.map((f) => f.key)}
          nextSort={
            features.length === 0
              ? 10
              : Math.max(...features.map((f) => f.sort_order)) + 10
          }
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            void reload();
          }}
        />
      )}
    </section>
  );
}

/* ───────────────────────── Feature form modal ───────────────────────── */

interface FormState {
  key: string;
  label: string;
  description: string;
  icon: string;
  sort_order: number;
  is_active: boolean;
}

function FeatureFormModal({
  initial,
  existingKeys,
  nextSort,
  onClose,
  onSaved,
}: {
  initial: ServiceFeature | null;
  existingKeys: string[];
  nextSort: number;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<FormState>(() =>
    initial
      ? {
          key: initial.key,
          label: initial.label,
          description: initial.description ?? "",
          icon: initial.icon,
          sort_order: initial.sort_order,
          is_active: initial.is_active,
        }
      : {
          key: "",
          label: "",
          description: "",
          icon: "Sparkles",
          sort_order: nextSort,
          is_active: true,
        },
  );
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.key.trim() || !form.label.trim()) {
      toast.error("key 與 label 為必填");
      return;
    }
    if (!/^[a-z0-9_]+$/.test(form.key)) {
      toast.error("key 只能用小寫字母 / 數字 / 底線");
      return;
    }
    if (!initial && existingKeys.includes(form.key)) {
      toast.error("此 key 已存在");
      return;
    }
    setSubmitting(true);
    const payload = {
      key: form.key,
      label: form.label,
      description: form.description.trim() || null,
      icon: form.icon,
      sort_order: form.sort_order,
      is_active: form.is_active,
    };
    const { error } = initial
      ? await supabase
          .from("service_features")
          .update(payload)
          .eq("id", initial.id)
      : await supabase.from("service_features").insert(payload);
    setSubmitting(false);
    if (error) {
      toast.error(formatSupabaseError(error));
      return;
    }
    toast.success(initial ? "已更新" : "已新增");
    onSaved();
  };

  const Icon = getFeatureIcon(form.icon);

  return (
    <Modal
      open
      onClose={onClose}
      title={initial ? "編輯服務特色" : "新增服務特色"}
      size="md"
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="label">識別 Key *</label>
          <input
            className="input"
            value={form.key}
            onChange={(e) => setForm({ ...form, key: e.target.value })}
            placeholder="例：vet_oncall"
            disabled={!!initial}
            required
          />
          <p className="helper">
            內部識別字,英數小寫 + 底線,建立後不可修改。
          </p>
        </div>

        <div>
          <label className="label">顯示文字 *</label>
          <input
            className="input"
            value={form.label}
            onChange={(e) => setForm({ ...form, label: e.target.value })}
            placeholder="例：合格獸醫合作 24h 緊急聯絡"
            required
          />
        </div>

        <div>
          <label className="label">說明（選填）</label>
          <textarea
            rows={2}
            className="input"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="顯示於商家頁面的補充說明"
          />
        </div>

        <div>
          <label className="label">圖示</label>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
              <Icon className="h-5 w-5" />
            </div>
            <select
              className="input flex-1"
              value={form.icon}
              onChange={(e) => setForm({ ...form, icon: e.target.value })}
            >
              {ICON_OPTIONS.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label">排序</label>
            <input
              type="number"
              className="input"
              value={form.sort_order}
              onChange={(e) =>
                setForm({ ...form, sort_order: Number(e.target.value) || 0 })
              }
            />
          </div>
          <label className="flex items-center gap-2 pt-7 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) =>
                setForm({ ...form, is_active: e.target.checked })
              }
            />
            啟用（可被商家勾選）
          </label>
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
          <button type="button" className="btn-ghost" onClick={onClose}>
            取消
          </button>
          <button
            type="submit"
            className="btn-primary"
            disabled={submitting}
          >
            {submitting && <Spinner size="sm" />}
            {initial ? "儲存" : "新增"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
