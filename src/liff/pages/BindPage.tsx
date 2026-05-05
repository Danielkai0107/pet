import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { ShieldCheck, Mail, Hash, Phone, ArrowLeft } from "lucide-react";
import toast from "react-hot-toast";
import { Spinner } from "@/components/Spinner";
import { LoadingScreen } from "@/components/LoadingScreen";
import { supabase, formatSupabaseError } from "@/lib/supabase";
import { LiffAuthProvider } from "@/liff/auth/LiffAuthProvider";
import { useLiffAuth } from "@/liff/auth/useLiffAuth";
import { LiffGate } from "@/liff/components/LiffGate";

type Step = "form" | "code" | "done";

function BindContent() {
  const { idToken, refresh } = useLiffAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>("form");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [backfilled, setBackfilled] = useState(0);

  if (!idToken) return <LoadingScreen />;

  const requestOtp = async (e: FormEvent) => {
    e.preventDefault();
    const phoneClean = phone.replace(/[\s\-()]/g, "");
    if (!/^\+?\d{8,15}$/.test(phoneClean)) {
      toast.error("手機號碼格式不正確");
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      toast.error("Email 格式不正確");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.functions.invoke("line-bind", {
      body: { step: "request_otp", idToken, email },
    });
    setSubmitting(false);
    if (error) {
      toast.error(formatSupabaseError(error));
      return;
    }
    toast.success("驗證碼已寄出");
    setStep("code");
  };

  const verifyOtp = async (e: FormEvent) => {
    e.preventDefault();
    if (code.trim().length !== 6) {
      toast.error("請輸入 6 碼驗證碼");
      return;
    }
    setSubmitting(true);
    const { data, error } = await supabase.functions.invoke("line-bind", {
      body: { step: "verify_otp", idToken, email, phone, code },
    });
    setSubmitting(false);
    if (error) {
      toast.error(formatSupabaseError(error));
      return;
    }
    toast.success("綁定成功！");
    setBackfilled(
      typeof data === "object" && data && "backfilled" in data
        ? Number((data as { backfilled?: number }).backfilled ?? 0)
        : 0,
    );
    await refresh();
    setStep("done");
  };

  return (
    <div className="px-4 py-8">
      <div className="card mx-auto max-w-md p-6">
        <button
          onClick={() => navigate(-1)}
          className="btn-ghost mb-3 text-sm"
        >
          <ArrowLeft className="h-4 w-4" />
          返回
        </button>

        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-brand-50">
          <ShieldCheck className="h-6 w-6 text-brand-700" />
        </div>

        {step === "form" && (
          <form onSubmit={requestOtp}>
            <h1 className="text-center text-lg font-bold text-slate-900">
              綁定我的訂單
            </h1>
            <p className="mt-1 text-center text-sm text-slate-500">
              填寫手機號 + Email，我們會寄一組 6 碼驗證碼到 Email
              並把這支 LINE 與你的訂單關聯起來。
            </p>
            <div className="mt-5">
              <label className="label">手機號碼</label>
              <div className="relative">
                <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  className="input pl-10"
                  placeholder="0912345678"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                />
              </div>
              <p className="helper">
                這支號碼會用來找出你過去用同樣手機預約的訂單
              </p>
            </div>
            <div className="mt-3">
              <label className="label">Email</label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  autoComplete="email"
                  className="input pl-10"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <p className="helper">驗證碼會寄到這個 Email</p>
            </div>
            <button
              type="submit"
              className="btn-primary mt-5 w-full"
              disabled={submitting}
            >
              {submitting && <Spinner size="sm" />}
              寄送驗證碼
            </button>
          </form>
        )}

        {step === "code" && (
          <form onSubmit={verifyOtp}>
            <h1 className="text-center text-lg font-bold text-slate-900">
              輸入驗證碼
            </h1>
            <p className="mt-1 text-center text-sm text-slate-500">
              我們已將 6 碼驗證碼寄到 <strong>{email}</strong>
            </p>
            <div className="mt-5">
              <label className="label">驗證碼</label>
              <div className="relative">
                <Hash className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="\d{6}"
                  maxLength={6}
                  className="input pl-10 text-center text-lg font-mono tracking-widest"
                  placeholder="000000"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                  required
                />
              </div>
              <p className="helper">5 分鐘內有效，最多嘗試 3 次</p>
            </div>
            <button
              type="submit"
              className="btn-primary mt-5 w-full"
              disabled={submitting}
            >
              {submitting && <Spinner size="sm" />}
              驗證並綁定
            </button>
            <button
              type="button"
              className="btn-ghost mt-2 w-full text-sm"
              onClick={() => setStep("form")}
            >
              重新輸入手機 / Email
            </button>
          </form>
        )}

        {step === "done" && (
          <div className="text-center">
            <h1 className="text-lg font-bold text-slate-900">綁定完成！</h1>
            <p className="mt-2 text-sm text-slate-600">
              {backfilled > 0 ? (
                <>
                  已為你關聯 <strong>{backfilled}</strong> 筆過去的訂單。
                </>
              ) : (
                <>未來新預約只要使用同手機/Email 就會自動顯示在這裡。</>
              )}
            </p>
            <button
              className="btn-primary mt-5 w-full"
              onClick={() => navigate("/liff")}
            >
              查看我的訂單
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// Standalone route — not nested under LiffLayout
export function LiffBindPage() {
  return (
    <LiffAuthProvider>
      <LiffGate>
        <BindContent />
      </LiffGate>
    </LiffAuthProvider>
  );
}
