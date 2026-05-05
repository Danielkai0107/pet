import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ChevronRight,
} from "lucide-react";
import toast from "react-hot-toast";
import { supabase, formatSupabaseError } from "@/lib/supabase";
import { PLATFORM_NAME } from "@/lib/constants";
import { useManagedOptions } from "@/lib/managedOptions";
import type { PetType } from "@/lib/types";
import { Spinner } from "@/components/Spinner";
import { useShopAuth } from "@/shop/auth/useShopAuth";

type Step = "account" | "shop" | "review" | "done";

interface ShopForm {
  name: string;
  slug: string;
  city: string;
  district: string;
  address: string;
  contactPhone: string;
  contactEmail: string;
  description: string;
  petTypes: PetType[];
}

const initialShopForm: ShopForm = {
  name: "",
  slug: "",
  city: "",
  district: "",
  address: "",
  contactPhone: "",
  contactEmail: "",
  description: "",
  petTypes: ["dog", "cat"],
};

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^\w\u4e00-\u9fa5]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export function ShopOnboardingPage() {
  const { user, member, refresh, ready } = useShopAuth();
  const navigate = useNavigate();
  const { petTypes, cities, petTypeLabel } = useManagedOptions();
  const activePetTypes = petTypes.filter((t) => t.is_active);
  const activeCities = cities.filter((c) => c.is_active);

  const initialStep: Step = !user ? "account" : member ? "done" : "shop";
  const [step, setStep] = useState<Step>(initialStep);
  useEffect(() => {
    if (ready) {
      setStep(!user ? "account" : member ? "done" : "shop");
    }
  }, [ready, user, member]);

  // Account form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [shopForm, setShopForm] = useState<ShopForm>(initialShopForm);

  const handleSignup = async (e: FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      toast.error("密碼至少 8 碼");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.auth.signUp({ email, password });
    setSubmitting(false);
    if (error) {
      toast.error(formatSupabaseError(error));
      return;
    }
    toast.success("帳號建立成功！");
    await refresh();
    setShopForm((s) => ({ ...s, contactEmail: email }));
    setStep("shop");
  };

  const handleShopNext = (e: FormEvent) => {
    e.preventDefault();
    if (!shopForm.name.trim()) {
      toast.error("請填寫店名");
      return;
    }
    if (!shopForm.slug.trim()) {
      toast.error("請填寫 URL slug");
      return;
    }
    setStep("review");
  };

  const handleSubmitShop = async () => {
    if (!user) {
      toast.error("尚未登入");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.rpc("create_shop_with_owner", {
      p_slug: shopForm.slug,
      p_name: shopForm.name,
      p_description: shopForm.description || null,
      p_city: shopForm.city || null,
      p_district: shopForm.district || null,
      p_address: shopForm.address || null,
      p_contact_phone: shopForm.contactPhone || null,
      p_contact_email: shopForm.contactEmail || user.email || null,
      p_pet_types: shopForm.petTypes,
    });
    setSubmitting(false);
    if (error) {
      toast.error(formatSupabaseError(error) || "建立商家失敗");
      return;
    }

    toast.success("商家資料已送出，等待審核");
    await refresh();
    setStep("done");
  };

  const stepIdx = useMemo(
    () => ({ account: 1, shop: 2, review: 3, done: 4 })[step],
    [step],
  );

  return (
    <div className="min-h-screen bg-white px-4 py-10">
      <div className="mx-auto max-w-2xl">
        <Link to="/" className="mb-6 flex items-center gap-2 text-neutral-900">
          <span className="text-lg font-bold tracking-tight">
            {PLATFORM_NAME}
          </span>
          <span className="text-sm font-medium text-neutral-500">店家入駐</span>
        </Link>

        <div className="mb-6 flex items-center gap-2 text-xs">
          <Pill active={stepIdx >= 1} label="1 帳號" />
          <ChevronRight className="h-4 w-4 text-neutral-300" />
          <Pill active={stepIdx >= 2} label="2 商家資訊" />
          <ChevronRight className="h-4 w-4 text-neutral-300" />
          <Pill active={stepIdx >= 3} label="3 確認送出" />
          <ChevronRight className="h-4 w-4 text-neutral-300" />
          <Pill active={stepIdx >= 4} label="4 完成" />
        </div>

        <div className="rounded-card border border-neutral-200 bg-white p-6">
          {step === "account" && (
            <form onSubmit={handleSignup} className="space-y-4">
              <h1 className="text-xl font-bold text-neutral-900">
                建立店家帳號
              </h1>
              <p className="text-sm text-neutral-500">
                請填寫您的 Email 與密碼，這將是後台登入帳號。
              </p>
              <div>
                <label className="label">Email</label>
                <input
                  type="email"
                  className="input"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={submitting}
                />
              </div>
              <div>
                <label className="label">密碼</label>
                <input
                  type="password"
                  className="input"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={submitting}
                />
                <p className="helper">至少 8 個字元</p>
              </div>
              <div className="flex justify-end">
                <button type="submit" className="btn-primary" disabled={submitting}>
                  {submitting && <Spinner size="sm" />}
                  下一步
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
              <p className="text-center text-sm text-neutral-500">
                已有帳號？
                <Link
                  to="/shop/login"
                  className="ml-1 font-semibold text-neutral-900 underline decoration-neutral-300 underline-offset-2"
                >
                  登入
                </Link>
              </p>
            </form>
          )}

          {step === "shop" && (
            <form onSubmit={handleShopNext} className="space-y-4">
              <h1 className="text-xl font-bold text-slate-900">填寫商家資訊</h1>
              <p className="text-sm text-slate-500">
                這些資訊會顯示在公開的商家頁，可以之後修改。
              </p>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="label">店名 *</label>
                  <input
                    className="input"
                    required
                    value={shopForm.name}
                    onChange={(e) => {
                      const name = e.target.value;
                      setShopForm((s) => ({
                        ...s,
                        name,
                        slug: s.slug || slugify(name),
                      }));
                    }}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="label">URL slug *</label>
                  <input
                    className="input font-mono"
                    required
                    value={shopForm.slug}
                    onChange={(e) =>
                      setShopForm((s) => ({ ...s, slug: slugify(e.target.value) }))
                    }
                  />
                  <p className="helper">公開頁網址：/shop/{shopForm.slug || "your-slug"}</p>
                </div>

                <div>
                  <label className="label">城市</label>
                  <select
                    className="input"
                    value={shopForm.city}
                    onChange={(e) => setShopForm((s) => ({ ...s, city: e.target.value }))}
                  >
                    <option value="">— 選擇 —</option>
                    {activeCities.map((c) => (
                      <option key={c.name} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">行政區</label>
                  <input
                    className="input"
                    value={shopForm.district}
                    onChange={(e) =>
                      setShopForm((s) => ({ ...s, district: e.target.value }))
                    }
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="label">完整地址</label>
                  <input
                    className="input"
                    value={shopForm.address}
                    onChange={(e) =>
                      setShopForm((s) => ({ ...s, address: e.target.value }))
                    }
                  />
                </div>

                <div>
                  <label className="label">聯絡電話</label>
                  <input
                    className="input"
                    value={shopForm.contactPhone}
                    onChange={(e) =>
                      setShopForm((s) => ({ ...s, contactPhone: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <label className="label">客服 Email</label>
                  <input
                    type="email"
                    className="input"
                    value={shopForm.contactEmail}
                    onChange={(e) =>
                      setShopForm((s) => ({ ...s, contactEmail: e.target.value }))
                    }
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="label">收的寵物類型</label>
                  <div className="flex flex-wrap gap-2">
                    {activePetTypes.map((p) => {
                      const checked = shopForm.petTypes.includes(p.key);
                      return (
                        <button
                          type="button"
                          key={p.key}
                          onClick={() =>
                            setShopForm((s) => ({
                              ...s,
                              petTypes: checked
                                ? s.petTypes.filter((x) => x !== p.key)
                                : [...s.petTypes, p.key],
                            }))
                          }
                          className={
                            "rounded-full border px-3 py-1.5 text-sm transition-colors " +
                            (checked
                              ? "border-neutral-900 bg-neutral-900 text-white"
                              : "border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50")
                          }
                        >
                          {p.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label className="label">商家簡介</label>
                  <textarea
                    rows={4}
                    className="input"
                    value={shopForm.description}
                    onChange={(e) =>
                      setShopForm((s) => ({ ...s, description: e.target.value }))
                    }
                    placeholder="向飼主介紹你的旅館特色…"
                  />
                </div>
              </div>

              <div className="flex justify-between">
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => setStep("account")}
                >
                  <ArrowLeft className="h-4 w-4" />
                  上一步
                </button>
                <button type="submit" className="btn-primary">
                  下一步
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </form>
          )}

          {step === "review" && (
            <div className="space-y-4">
              <h1 className="text-xl font-bold text-neutral-900">確認商家資訊</h1>
              <ReviewRow label="店名" value={shopForm.name} />
              <ReviewRow label="URL slug" value={shopForm.slug} />
              <ReviewRow
                label="城市 / 行政區"
                value={
                  [shopForm.city, shopForm.district]
                    .filter(Boolean)
                    .join(" ") || "—"
                }
              />
              <ReviewRow label="地址" value={shopForm.address || "—"} />
              <ReviewRow label="聯絡電話" value={shopForm.contactPhone || "—"} />
              <ReviewRow
                label="客服 Email"
                value={shopForm.contactEmail || "—"}
              />
              <ReviewRow
                label="寵物類型"
                value={
                  shopForm.petTypes.map((p) => petTypeLabel(p)).join("、") ||
                  "—"
                }
              />
              <ReviewRow label="簡介" value={shopForm.description || "—"} />

              <p className="text-xs text-neutral-500">
                送出後會等待平台審核。審核通過前，商家頁不會公開。
              </p>

              <div className="flex justify-between">
                <button className="btn-ghost" onClick={() => setStep("shop")}>
                  <ArrowLeft className="h-4 w-4" />
                  上一步
                </button>
                <button
                  className="btn-primary"
                  onClick={handleSubmitShop}
                  disabled={submitting}
                >
                  {submitting && <Spinner size="sm" />}
                  送出申請
                </button>
              </div>
            </div>
          )}

          {step === "done" && (
            <div className="space-y-4 text-center">
              <CheckCircle2
                className="mx-auto h-12 w-12 text-brand-500"
                strokeWidth={1.5}
              />
              <h1 className="text-xl font-bold text-neutral-900">已送出申請</h1>
              <p className="text-sm text-neutral-600">
                您可以先進入後台設定房型與庫存，審核通過後商家頁就會自動公開。
              </p>
              <button
                className="btn-primary mx-auto"
                onClick={() => navigate("/shop/today")}
              >
                進入後台
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Pill({ active, label }: { active: boolean; label: string }) {
  return (
    <span
      className={
        "rounded-full px-2.5 py-1 font-medium " +
        (active
          ? "bg-neutral-900 text-white"
          : "bg-neutral-100 text-neutral-500")
      }
    >
      {label}
    </span>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start gap-4 border-b border-neutral-100 pb-3 last:border-0">
      <span className="w-24 shrink-0 text-sm text-neutral-500">{label}</span>
      <span className="flex-1 text-sm font-medium text-neutral-900">
        {value}
      </span>
    </div>
  );
}
