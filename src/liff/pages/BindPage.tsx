import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { ShieldCheck, Mail, Hash, ArrowLeft } from "lucide-react";
import toast from "react-hot-toast";
import { Spinner } from "@/components/Spinner";
import { LoadingScreen } from "@/components/LoadingScreen";
import { supabase, formatSupabaseError } from "@/lib/supabase";
import { LiffAuthProvider } from "@/liff/auth/LiffAuthProvider";
import { useLiffAuth } from "@/liff/auth/useLiffAuth";
import { LiffGate } from "@/liff/components/LiffGate";

type Step = "email" | "code" | "done";

function BindContent() {
  const { idToken, refresh } = useLiffAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!idToken) return <LoadingScreen />;

  const requestOtp = async (e: FormEvent) => {
    e.preventDefault();
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
    const { error } = await supabase.functions.invoke("line-bind", {
      body: { step: "verify_otp", idToken, email, code },
    });
    setSubmitting(false);
    if (error) {
      toast.error(formatSupabaseError(error));
      return;
    }
    toast.success("綁定成功！");
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

        {step === "email" && (
          <form onSubmit={requestOtp}>
            <h1 className="text-center text-lg font-bold text-slate-900">
              綁定我的訂單
            </h1>
            <p className="mt-1 text-center text-sm text-slate-500">
              輸入您預約時填寫的 Email，我們會寄送一組 6 碼驗證碼。
            </p>
            <div className="mt-5">
              <label className="label">Email</label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  className="input pl-10"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
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
              onClick={() => setStep("email")}
            >
              重新輸入 Email
            </button>
          </form>
        )}

        {step === "done" && (
          <div className="text-center">
            <h1 className="text-lg font-bold text-slate-900">綁定完成！</h1>
            <p className="mt-2 text-sm text-slate-600">
              我們已將您過去的訂單歸戶至此 LINE 帳號，
              未來新預約也會自動關聯。
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
