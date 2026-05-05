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
import {
  useManagedOptions,
  type CityOption,
  type PetSizeOption,
  type PetTypeOption,
} from "@/lib/managedOptions";
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
        <div className="flex h-11 w-11 items-center justify-center rounded-full border border-neutral-200 text-neutral-700">
          <Sliders className="h-5 w-5" strokeWidth={1.5} />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900">
            站台設定
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            首頁 hero、服務特色清單等全站性的呈現設定。
          </p>
        </div>
      </header>

      <HeroImageSection />
      <ServiceFeaturesSection />
      <PetTypesSection />
      <PetSizesSection />
      <CitiesSection />
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
    <section className="rounded-card border border-neutral-200 bg-white p-6">
      <h2 className="text-base font-semibold text-neutral-900">
        首頁 Hero 背景圖
      </h2>
      <p className="mt-1 text-xs text-neutral-500">
        建議寬度 ≥ 1920px、比例約 21:9 / 16:9。會顯示為公開首頁頂端的大圖
        banner，留白時則使用預設淡色背景。
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
    <section className="rounded-card border border-neutral-200 bg-white p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-neutral-900">
            服務特色清單
          </h2>
          <p className="mt-1 text-xs text-neutral-500">
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
          <p className="rounded-xl border border-neutral-200 p-6 text-center text-sm text-neutral-500">
            還沒有任何特色,點上方「新增特色」開始建立。
          </p>
        ) : (
          features.map((f, idx) => {
            const Icon = getFeatureIcon(f.icon);
            return (
              <div
                key={f.id}
                className="flex items-start gap-3 rounded-xl border border-neutral-200 bg-white p-3"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-neutral-200 text-neutral-700">
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 text-sm font-semibold text-neutral-900">
                    {f.label}
                    {!f.is_active && (
                      <span className="tag-outline">已停用</span>
                    )}
                  </p>
                  {f.description && (
                    <p className="mt-0.5 line-clamp-2 text-xs text-neutral-500">
                      {f.description}
                    </p>
                  )}
                  <p className="mt-0.5 font-mono text-[10px] text-neutral-400">
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
                    className="btn-ghost text-rose-700"
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
            <div className="flex h-11 w-11 items-center justify-center rounded-full border border-neutral-200 text-neutral-700">
              <Icon className="h-4 w-4" />
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
          <label className="flex items-center gap-2 pt-7 text-sm text-neutral-700">
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

        <div className="flex justify-end gap-2 border-t border-neutral-100 pt-4">
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

/* ───────────────────────── Pet types (寵物類型) ───────────────────────── */

function PetTypesSection() {
  const { petTypes, petSizes, petSizeOverrides, reload } = useManagedOptions();
  const [editing, setEditing] = useState<PetTypeOption | "new" | null>(null);

  const sorted = [...petTypes].sort((a, b) => a.sort_order - b.sort_order);

  const move = async (key: string, dir: -1 | 1) => {
    const i = sorted.findIndex((x) => x.key === key);
    const j = i + dir;
    if (j < 0 || j >= sorted.length) return;
    const a = sorted[i];
    const b = sorted[j];
    const { error } = await supabase
      .from("pet_types")
      .upsert([
        { key: a.key, label: a.label, sort_order: b.sort_order },
        { key: b.key, label: b.label, sort_order: a.sort_order },
      ]);
    if (error) toast.error(formatSupabaseError(error));
    else await reload();
  };

  const toggleActive = async (t: PetTypeOption) => {
    const { error } = await supabase
      .from("pet_types")
      .update({ is_active: !t.is_active })
      .eq("key", t.key);
    if (error) toast.error(formatSupabaseError(error));
    else {
      toast.success(t.is_active ? "已停用" : "已啟用");
      await reload();
    }
  };

  const removeOne = async (t: PetTypeOption) => {
    if (
      !confirm(
        `確定要刪除「${t.label}」（${t.key}）？\n\n注意：已使用此類型的店家、房型與訂單仍會保留原資料，但將不再出現在新表單的選項中。`,
      )
    )
      return;
    const { error } = await supabase.from("pet_types").delete().eq("key", t.key);
    if (error) toast.error(formatSupabaseError(error));
    else {
      toast.success("已刪除");
      await reload();
    }
  };

  return (
    <section className="rounded-card border border-neutral-200 bg-white p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-neutral-900">寵物類型</h2>
          <p className="mt-1 text-xs text-neutral-500">
            這份清單會出現在公開頁的搜尋、商家設定的「收的寵物類型」、預約時的「寵物類型」選單。
            可為每個類型客製化每種體型的描述（例如：狗 / 大型 = 大型 (25-40kg)）。
          </p>
        </div>
        <button className="btn-primary shrink-0" onClick={() => setEditing("new")}>
          <Plus className="h-4 w-4" />
          新增類型
        </button>
      </div>

      <div className="mt-4 space-y-2">
        {sorted.length === 0 ? (
          <p className="rounded-xl border border-neutral-200 p-6 text-center text-sm text-neutral-500">
            還沒有任何寵物類型。
          </p>
        ) : (
          sorted.map((t, idx) => (
            <div
              key={t.key}
              className="flex items-start gap-3 rounded-xl border border-neutral-200 bg-white p-3"
            >
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 text-sm font-semibold text-neutral-900">
                  {t.label}
                  {!t.is_active && <span className="tag-outline">已停用</span>}
                </p>
                <p className="mt-0.5 font-mono text-[10px] text-neutral-400">
                  key: {t.key} · sort: {t.sort_order}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button
                  className="btn-ghost"
                  onClick={() => move(t.key, -1)}
                  disabled={idx === 0}
                  title="上移"
                >
                  <ArrowUp className="h-4 w-4" />
                </button>
                <button
                  className="btn-ghost"
                  onClick={() => move(t.key, 1)}
                  disabled={idx === sorted.length - 1}
                  title="下移"
                >
                  <ArrowDown className="h-4 w-4" />
                </button>
                <button
                  className="btn-ghost"
                  onClick={() => toggleActive(t)}
                  title={t.is_active ? "停用" : "啟用"}
                >
                  {t.is_active ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
                <button
                  className="btn-ghost"
                  onClick={() => setEditing(t)}
                  title="編輯"
                >
                  編輯
                </button>
                <button
                  className="btn-ghost text-rose-700"
                  onClick={() => removeOne(t)}
                  title="刪除"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {editing !== null && (
        <PetTypeFormModal
          initial={editing === "new" ? null : editing}
          existingKeys={petTypes.map((t) => t.key)}
          allSizes={petSizes}
          overrides={petSizeOverrides}
          nextSort={
            sorted.length === 0
              ? 10
              : Math.max(...sorted.map((t) => t.sort_order)) + 10
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

interface PetTypeFormState {
  key: string;
  label: string;
  sort_order: number;
  is_active: boolean;
  /** key=size_key, value=label override (空字串表示「不要 override」) */
  sizeOverrides: Record<string, string>;
}

function PetTypeFormModal({
  initial,
  existingKeys,
  allSizes,
  overrides,
  nextSort,
  onClose,
  onSaved,
}: {
  initial: PetTypeOption | null;
  existingKeys: string[];
  allSizes: PetSizeOption[];
  overrides: Map<string, string>;
  nextSort: number;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<PetTypeFormState>(() => {
    const base: PetTypeFormState = initial
      ? {
          key: initial.key,
          label: initial.label,
          sort_order: initial.sort_order,
          is_active: initial.is_active,
          sizeOverrides: {},
        }
      : {
          key: "",
          label: "",
          sort_order: nextSort,
          is_active: true,
          sizeOverrides: {},
        };
    if (initial) {
      for (const s of allSizes) {
        const v = overrides.get(`${initial.key}|${s.key}`);
        if (v) base.sizeOverrides[s.key] = v;
      }
    }
    return base;
  });
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.key.trim() || !form.label.trim()) {
      toast.error("key 與顯示文字為必填");
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
      sort_order: form.sort_order,
      is_active: form.is_active,
    };
    const { error } = initial
      ? await supabase.from("pet_types").update(payload).eq("key", initial.key)
      : await supabase.from("pet_types").insert(payload);
    if (error) {
      setSubmitting(false);
      toast.error(formatSupabaseError(error));
      return;
    }

    // Sync overrides: upsert non-empty, delete empty
    const upserts = Object.entries(form.sizeOverrides)
      .filter(([, v]) => v.trim() !== "")
      .map(([sizeKey, label]) => ({
        pet_type_key: form.key,
        pet_size_key: sizeKey,
        label: label.trim(),
      }));
    const deletes = Object.entries(form.sizeOverrides)
      .filter(([, v]) => v.trim() === "")
      .map(([sizeKey]) => sizeKey);

    if (upserts.length > 0) {
      const { error: upErr } = await supabase
        .from("pet_type_size_labels")
        .upsert(upserts, { onConflict: "pet_type_key,pet_size_key" });
      if (upErr) {
        setSubmitting(false);
        toast.error(formatSupabaseError(upErr));
        return;
      }
    }
    if (deletes.length > 0) {
      const { error: delErr } = await supabase
        .from("pet_type_size_labels")
        .delete()
        .eq("pet_type_key", form.key)
        .in("pet_size_key", deletes);
      if (delErr) {
        setSubmitting(false);
        toast.error(formatSupabaseError(delErr));
        return;
      }
    }

    setSubmitting(false);
    toast.success(initial ? "已更新" : "已新增");
    onSaved();
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={initial ? "編輯寵物類型" : "新增寵物類型"}
      size="md"
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="label">識別 Key *</label>
          <input
            className="input"
            value={form.key}
            onChange={(e) => setForm({ ...form, key: e.target.value })}
            placeholder="例：dog / hamster"
            disabled={!!initial}
            required
          />
          <p className="helper">
            內部識別字，英數小寫 + 底線，建立後不可修改。
          </p>
        </div>

        <div>
          <label className="label">顯示文字 *</label>
          <input
            className="input"
            value={form.label}
            onChange={(e) => setForm({ ...form, label: e.target.value })}
            placeholder="例：狗 / 倉鼠"
            required
          />
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
          <label className="flex items-center gap-2 pt-7 text-sm text-neutral-700">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) =>
                setForm({ ...form, is_active: e.target.checked })
              }
            />
            啟用（可被選擇）
          </label>
        </div>

        <div>
          <label className="label">每個體型的客製化描述（選填）</label>
          <p className="helper mb-2">
            留空則使用該體型本身的預設文字。
          </p>
          <div className="space-y-2 rounded-xl border border-neutral-200 p-3">
            {allSizes.length === 0 ? (
              <p className="text-xs text-neutral-500">尚未建立任何體型。</p>
            ) : (
              allSizes
                .slice()
                .sort((a, b) => a.sort_order - b.sort_order)
                .map((s) => (
                  <div key={s.key} className="flex items-center gap-3">
                    <span className="w-20 shrink-0 text-xs text-neutral-500">
                      {s.label}
                    </span>
                    <input
                      className="input flex-1"
                      placeholder={s.label}
                      value={form.sizeOverrides[s.key] ?? ""}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          sizeOverrides: {
                            ...form.sizeOverrides,
                            [s.key]: e.target.value,
                          },
                        })
                      }
                    />
                  </div>
                ))
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-neutral-100 pt-4">
          <button type="button" className="btn-ghost" onClick={onClose}>
            取消
          </button>
          <button type="submit" className="btn-primary" disabled={submitting}>
            {submitting && <Spinner size="sm" />}
            {initial ? "儲存" : "新增"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

/* ───────────────────────── Pet sizes (寵物體型) ───────────────────────── */

function PetSizesSection() {
  const { petSizes, reload } = useManagedOptions();
  const [editing, setEditing] = useState<PetSizeOption | "new" | null>(null);

  const sorted = [...petSizes].sort((a, b) => a.sort_order - b.sort_order);

  const move = async (key: string, dir: -1 | 1) => {
    const i = sorted.findIndex((x) => x.key === key);
    const j = i + dir;
    if (j < 0 || j >= sorted.length) return;
    const a = sorted[i];
    const b = sorted[j];
    const { error } = await supabase.from("pet_sizes").upsert([
      { key: a.key, label: a.label, sort_order: b.sort_order },
      { key: b.key, label: b.label, sort_order: a.sort_order },
    ]);
    if (error) toast.error(formatSupabaseError(error));
    else await reload();
  };

  const toggleActive = async (t: PetSizeOption) => {
    const { error } = await supabase
      .from("pet_sizes")
      .update({ is_active: !t.is_active })
      .eq("key", t.key);
    if (error) toast.error(formatSupabaseError(error));
    else {
      toast.success(t.is_active ? "已停用" : "已啟用");
      await reload();
    }
  };

  const removeOne = async (t: PetSizeOption) => {
    if (!confirm(`確定要刪除「${t.label}」（${t.key}）？`)) return;
    const { error } = await supabase.from("pet_sizes").delete().eq("key", t.key);
    if (error) toast.error(formatSupabaseError(error));
    else {
      toast.success("已刪除");
      await reload();
    }
  };

  return (
    <section className="rounded-card border border-neutral-200 bg-white p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-neutral-900">寵物體型</h2>
          <p className="mt-1 text-xs text-neutral-500">
            房型「適合的體型」與預約時「體型」選單會用到這份清單。
          </p>
        </div>
        <button className="btn-primary shrink-0" onClick={() => setEditing("new")}>
          <Plus className="h-4 w-4" />
          新增體型
        </button>
      </div>

      <div className="mt-4 space-y-2">
        {sorted.length === 0 ? (
          <p className="rounded-xl border border-neutral-200 p-6 text-center text-sm text-neutral-500">
            還沒有任何體型。
          </p>
        ) : (
          sorted.map((t, idx) => (
            <div
              key={t.key}
              className="flex items-start gap-3 rounded-xl border border-neutral-200 bg-white p-3"
            >
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 text-sm font-semibold text-neutral-900">
                  {t.label}
                  {!t.is_active && <span className="tag-outline">已停用</span>}
                </p>
                <p className="mt-0.5 font-mono text-[10px] text-neutral-400">
                  key: {t.key} · sort: {t.sort_order}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button
                  className="btn-ghost"
                  onClick={() => move(t.key, -1)}
                  disabled={idx === 0}
                >
                  <ArrowUp className="h-4 w-4" />
                </button>
                <button
                  className="btn-ghost"
                  onClick={() => move(t.key, 1)}
                  disabled={idx === sorted.length - 1}
                >
                  <ArrowDown className="h-4 w-4" />
                </button>
                <button className="btn-ghost" onClick={() => toggleActive(t)}>
                  {t.is_active ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
                <button className="btn-ghost" onClick={() => setEditing(t)}>
                  編輯
                </button>
                <button
                  className="btn-ghost text-rose-700"
                  onClick={() => removeOne(t)}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {editing !== null && (
        <PetSizeFormModal
          initial={editing === "new" ? null : editing}
          existingKeys={petSizes.map((s) => s.key)}
          nextSort={
            sorted.length === 0
              ? 10
              : Math.max(...sorted.map((t) => t.sort_order)) + 10
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

function PetSizeFormModal({
  initial,
  existingKeys,
  nextSort,
  onClose,
  onSaved,
}: {
  initial: PetSizeOption | null;
  existingKeys: string[];
  nextSort: number;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    key: initial?.key ?? "",
    label: initial?.label ?? "",
    sort_order: initial?.sort_order ?? nextSort,
    is_active: initial?.is_active ?? true,
  });
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.key.trim() || !form.label.trim()) {
      toast.error("key 與顯示文字為必填");
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
      sort_order: form.sort_order,
      is_active: form.is_active,
    };
    const { error } = initial
      ? await supabase.from("pet_sizes").update(payload).eq("key", initial.key)
      : await supabase.from("pet_sizes").insert(payload);
    setSubmitting(false);
    if (error) {
      toast.error(formatSupabaseError(error));
      return;
    }
    toast.success(initial ? "已更新" : "已新增");
    onSaved();
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={initial ? "編輯寵物體型" : "新增寵物體型"}
      size="md"
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="label">識別 Key *</label>
          <input
            className="input"
            value={form.key}
            onChange={(e) => setForm({ ...form, key: e.target.value })}
            placeholder="例：small / xxlarge"
            disabled={!!initial}
            required
          />
        </div>
        <div>
          <label className="label">顯示文字 *</label>
          <input
            className="input"
            value={form.label}
            onChange={(e) => setForm({ ...form, label: e.target.value })}
            placeholder="例：小型"
            required
          />
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
          <label className="flex items-center gap-2 pt-7 text-sm text-neutral-700">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) =>
                setForm({ ...form, is_active: e.target.checked })
              }
            />
            啟用
          </label>
        </div>
        <div className="flex justify-end gap-2 border-t border-neutral-100 pt-4">
          <button type="button" className="btn-ghost" onClick={onClose}>
            取消
          </button>
          <button type="submit" className="btn-primary" disabled={submitting}>
            {submitting && <Spinner size="sm" />}
            {initial ? "儲存" : "新增"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

/* ───────────────────────── Cities (城市清單) ───────────────────────── */

function CitiesSection() {
  const { cities, reload } = useManagedOptions();
  const [editing, setEditing] = useState<CityOption | "new" | null>(null);

  const sorted = [...cities].sort((a, b) => a.sort_order - b.sort_order);

  const move = async (name: string, dir: -1 | 1) => {
    const i = sorted.findIndex((x) => x.name === name);
    const j = i + dir;
    if (j < 0 || j >= sorted.length) return;
    const a = sorted[i];
    const b = sorted[j];
    const { error } = await supabase.from("cities").upsert([
      { name: a.name, sort_order: b.sort_order },
      { name: b.name, sort_order: a.sort_order },
    ]);
    if (error) toast.error(formatSupabaseError(error));
    else await reload();
  };

  const toggleActive = async (c: CityOption) => {
    const { error } = await supabase
      .from("cities")
      .update({ is_active: !c.is_active })
      .eq("name", c.name);
    if (error) toast.error(formatSupabaseError(error));
    else {
      toast.success(c.is_active ? "已停用" : "已啟用");
      await reload();
    }
  };

  const removeOne = async (c: CityOption) => {
    if (!confirm(`確定要刪除「${c.name}」？`)) return;
    const { error } = await supabase.from("cities").delete().eq("name", c.name);
    if (error) toast.error(formatSupabaseError(error));
    else {
      toast.success("已刪除");
      await reload();
    }
  };

  return (
    <section className="rounded-card border border-neutral-200 bg-white p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-neutral-900">城市清單</h2>
          <p className="mt-1 text-xs text-neutral-500">
            出現在公開頁搜尋與商家設定中的城市選單。
          </p>
        </div>
        <button className="btn-primary shrink-0" onClick={() => setEditing("new")}>
          <Plus className="h-4 w-4" />
          新增城市
        </button>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {sorted.length === 0 ? (
          <p className="rounded-xl border border-neutral-200 p-6 text-center text-sm text-neutral-500 sm:col-span-2">
            還沒有任何城市。
          </p>
        ) : (
          sorted.map((c, idx) => (
            <div
              key={c.name}
              className="flex items-center gap-2 rounded-xl border border-neutral-200 bg-white p-2.5"
            >
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 text-sm font-medium text-neutral-900">
                  {c.name}
                  {!c.is_active && <span className="tag-outline">已停用</span>}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-0.5">
                <button
                  className="btn-ghost"
                  onClick={() => move(c.name, -1)}
                  disabled={idx === 0}
                >
                  <ArrowUp className="h-3.5 w-3.5" />
                </button>
                <button
                  className="btn-ghost"
                  onClick={() => move(c.name, 1)}
                  disabled={idx === sorted.length - 1}
                >
                  <ArrowDown className="h-3.5 w-3.5" />
                </button>
                <button className="btn-ghost" onClick={() => toggleActive(c)}>
                  {c.is_active ? (
                    <EyeOff className="h-3.5 w-3.5" />
                  ) : (
                    <Eye className="h-3.5 w-3.5" />
                  )}
                </button>
                <button className="btn-ghost" onClick={() => setEditing(c)}>
                  編輯
                </button>
                <button
                  className="btn-ghost text-rose-700"
                  onClick={() => removeOne(c)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {editing !== null && (
        <CityFormModal
          initial={editing === "new" ? null : editing}
          existingNames={cities.map((c) => c.name)}
          nextSort={
            sorted.length === 0
              ? 10
              : Math.max(...sorted.map((c) => c.sort_order)) + 10
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

function CityFormModal({
  initial,
  existingNames,
  nextSort,
  onClose,
  onSaved,
}: {
  initial: CityOption | null;
  existingNames: string[];
  nextSort: number;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    name: initial?.name ?? "",
    sort_order: initial?.sort_order ?? nextSort,
    is_active: initial?.is_active ?? true,
  });
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("城市名稱為必填");
      return;
    }
    if (!initial && existingNames.includes(form.name)) {
      toast.error("此城市已存在");
      return;
    }
    setSubmitting(true);
    const payload = {
      name: form.name,
      sort_order: form.sort_order,
      is_active: form.is_active,
    };
    const { error } = initial
      ? await supabase
          .from("cities")
          .update({
            sort_order: form.sort_order,
            is_active: form.is_active,
          })
          .eq("name", initial.name)
      : await supabase.from("cities").insert(payload);
    setSubmitting(false);
    if (error) {
      toast.error(formatSupabaseError(error));
      return;
    }
    toast.success(initial ? "已更新" : "已新增");
    onSaved();
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={initial ? "編輯城市" : "新增城市"}
      size="md"
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="label">城市名稱 *</label>
          <input
            className="input"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="例：台北市"
            disabled={!!initial}
            required
          />
          <p className="helper">建立後不可修改名稱（避免破壞既有店家資料）。</p>
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
          <label className="flex items-center gap-2 pt-7 text-sm text-neutral-700">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) =>
                setForm({ ...form, is_active: e.target.checked })
              }
            />
            啟用
          </label>
        </div>
        <div className="flex justify-end gap-2 border-t border-neutral-100 pt-4">
          <button type="button" className="btn-ghost" onClick={onClose}>
            取消
          </button>
          <button type="submit" className="btn-primary" disabled={submitting}>
            {submitting && <Spinner size="sm" />}
            {initial ? "儲存" : "新增"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
