import { useEffect, useState, type FormEvent } from "react";
import toast from "react-hot-toast";
import {
  BOOKING_STATUS_COLOR,
  PET_TYPE_LABEL,
  TAIWAN_CITIES,
} from "@/lib/constants";
import { supabase, formatSupabaseError } from "@/lib/supabase";
import type { PetType, ShopStatus } from "@/lib/types";
import { Spinner } from "@/components/Spinner";
import { Badge } from "@/components/Badge";
import { ImageUploader } from "@/components/ImageUploader";
import { useShopAuth } from "@/shop/auth/useShopAuth";
import { PageHeader } from "@/shop/components/PageHeader";
import { useServiceFeatures } from "@/lib/useServiceFeatures";
import { getFeatureIcon } from "@/lib/featureIcon";

const STATUS_LABEL: Record<ShopStatus, string> = {
  pending_review: "待審核",
  active: "上架中",
  suspended: "已暫停",
  rejected: "已拒絕",
};

const STATUS_COLOR: Record<ShopStatus, string> = {
  pending_review: BOOKING_STATUS_COLOR.pending,
  active: BOOKING_STATUS_COLOR.confirmed,
  suspended: BOOKING_STATUS_COLOR.cancelled,
  rejected: BOOKING_STATUS_COLOR.declined,
};

interface FormState {
  name: string;
  description: string;
  city: string;
  district: string;
  address: string;
  contact_phone: string;
  contact_email: string;
  line_oa_url: string;
  cover_image_url: string | null;
  pet_types: PetType[];
  service_feature_keys: string[];
}

export function ShopSettingsPage() {
  const { shop, refresh } = useShopAuth();
  const { features } = useServiceFeatures();
  const [form, setForm] = useState<FormState | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!shop) return;
    setForm({
      name: shop.name,
      description: shop.description ?? "",
      city: shop.city ?? "",
      district: shop.district ?? "",
      address: shop.address ?? "",
      contact_phone: shop.contact_phone ?? "",
      contact_email: shop.contact_email ?? "",
      line_oa_url: shop.line_oa_url ?? "",
      cover_image_url: shop.cover_image_url ?? null,
      pet_types: shop.pet_types,
      service_feature_keys: shop.service_feature_keys ?? [],
    });
  }, [shop]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!shop || !form) return;
    setSubmitting(true);
    const { error } = await supabase
      .from("shops")
      .update({
        name: form.name,
        description: form.description || null,
        city: form.city || null,
        district: form.district || null,
        address: form.address || null,
        contact_phone: form.contact_phone || null,
        contact_email: form.contact_email || null,
        line_oa_url: form.line_oa_url || null,
        cover_image_url: form.cover_image_url,
        pet_types: form.pet_types,
        service_feature_keys: form.service_feature_keys,
      })
      .eq("id", shop.id);
    setSubmitting(false);
    if (error) {
      toast.error(formatSupabaseError(error));
      return;
    }
    toast.success("已儲存");
    await refresh();
  };

  if (!shop || !form) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <PageHeader
        title="商家設定"
        description="這些資訊會顯示在公開的商家頁。"
        action={
          <Badge className={STATUS_COLOR[shop.status]}>
            {STATUS_LABEL[shop.status]}
          </Badge>
        }
      />

      <form onSubmit={handleSubmit} className="card space-y-5 p-6">
        <Field
          label="商家封面圖"
          hint="會顯示在搜尋結果、店家頁，以及 LINE 通知卡片頂端，建議 16:9"
        >
          <ImageUploader
            mode="single"
            value={form.cover_image_url}
            onChange={(url) => setForm({ ...form, cover_image_url: url })}
            pathPrefix={`${shop.id}/cover`}
            aspectRatio="16/9"
          />
        </Field>

        <Field label="店名 *" required>
          <input
            className="input"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
        </Field>

        <Field label="商家簡介">
          <textarea
            rows={4}
            className="input"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="城市">
            <select
              className="input"
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
            >
              <option value="">— 選擇 —</option>
              {TAIWAN_CITIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </Field>
          <Field label="行政區">
            <input
              className="input"
              value={form.district}
              onChange={(e) => setForm({ ...form, district: e.target.value })}
            />
          </Field>
        </div>

        <Field label="完整地址">
          <input
            className="input"
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="聯絡電話">
            <input
              className="input"
              value={form.contact_phone}
              onChange={(e) => setForm({ ...form, contact_phone: e.target.value })}
            />
          </Field>
          <Field label="客服 Email">
            <input
              type="email"
              className="input"
              value={form.contact_email}
              onChange={(e) => setForm({ ...form, contact_email: e.target.value })}
            />
          </Field>
        </div>

        <Field
          label="您的 LINE OA 連結（選填）"
          hint="把這個 OA 連結放到圖文選單中即可導入訂房"
        >
          <input
            className="input"
            placeholder="https://line.me/R/ti/p/@your-shop"
            value={form.line_oa_url}
            onChange={(e) => setForm({ ...form, line_oa_url: e.target.value })}
          />
        </Field>

        <Field label="收的寵物類型">
          <div className="flex flex-wrap gap-2">
            {(Object.keys(PET_TYPE_LABEL) as PetType[]).map((p) => {
              const checked = form.pet_types.includes(p);
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() =>
                    setForm({
                      ...form,
                      pet_types: checked
                        ? form.pet_types.filter((x) => x !== p)
                        : [...form.pet_types, p],
                    })
                  }
                  className={
                    "rounded-full border px-3 py-1.5 text-sm transition-colors " +
                    (checked
                      ? "border-brand-500 bg-brand-50 text-brand-700"
                      : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50")
                  }
                >
                  {PET_TYPE_LABEL[p]}
                </button>
              );
            })}
          </div>
        </Field>

        <Field
          label="服務特色"
          hint="勾選的項目會顯示在您的公開商家頁,讓消費者更容易判斷是否符合需求"
        >
          {features.length === 0 ? (
            <p className="rounded-lg bg-slate-50 p-3 text-xs text-slate-500">
              平台尚未建立服務特色清單,請等候管理員設定。
            </p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {features.map((f) => {
                const Icon = getFeatureIcon(f.icon);
                const checked = form.service_feature_keys.includes(f.key);
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() =>
                      setForm({
                        ...form,
                        service_feature_keys: checked
                          ? form.service_feature_keys.filter((k) => k !== f.key)
                          : [...form.service_feature_keys, f.key],
                      })
                    }
                    className={
                      "flex items-start gap-2.5 rounded-lg border p-3 text-left transition-colors " +
                      (checked
                        ? "border-brand-500 bg-brand-50"
                        : "border-slate-200 bg-white hover:bg-slate-50")
                    }
                  >
                    <div
                      className={
                        "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg " +
                        (checked
                          ? "bg-white text-brand-700"
                          : "bg-brand-50 text-brand-700")
                      }
                    >
                      <Icon className="h-4.5 w-4.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p
                        className={
                          "text-sm font-semibold " +
                          (checked ? "text-brand-800" : "text-slate-900")
                        }
                      >
                        {f.label}
                      </p>
                      {f.description && (
                        <p className="mt-0.5 line-clamp-2 text-[11px] text-slate-500">
                          {f.description}
                        </p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </Field>

        <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
          <button type="submit" className="btn-primary" disabled={submitting}>
            {submitting && <Spinner size="sm" />}
            儲存變更
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="label">
        {label}
        {required && <span className="ml-1 text-rose-500">*</span>}
      </label>
      {children}
      {hint && <p className="helper">{hint}</p>}
    </div>
  );
}
