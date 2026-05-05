import { useState, type FormEvent } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { Mail, Lock } from "lucide-react";
import toast from "react-hot-toast";
import { supabase, formatSupabaseError } from "@/lib/supabase";
import { PLATFORM_NAME } from "@/lib/constants";
import { Spinner } from "@/components/Spinner";
import { useShopAuth } from "@/shop/auth/useShopAuth";

interface LocationState {
  from?: string;
}

export function ShopLoginPage() {
  const { user, member, ready } = useShopAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const from = (location.state as LocationState | null)?.from;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (ready && user) {
    return <Navigate to={member ? (from ?? "/shop/today") : "/shop/onboarding"} replace />;
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("請輸入 Email 與密碼");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setSubmitting(false);
    if (error) {
      toast.error(formatSupabaseError(error));
      return;
    }
    toast.success("登入成功");
    navigate(from ?? "/shop/today", { replace: true });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-4">
      <div className="w-full max-w-sm">
        <Link
          to="/"
          className="mb-8 flex items-center justify-center gap-2 text-neutral-900"
        >
          <span className="text-lg font-bold tracking-tight">
            {PLATFORM_NAME}
          </span>
          <span className="text-sm font-medium text-neutral-500">店家後台</span>
        </Link>
        <h1 className="text-2xl font-bold tracking-tight text-neutral-900">
          店家登入
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          使用您的合作店家 Email 登入後台
        </p>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="label">Email</label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
              <input
                type="email"
                autoComplete="email"
                className="input pl-10"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={submitting}
                required
              />
            </div>
          </div>
          <div>
            <label className="label">密碼</label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
              <input
                type="password"
                autoComplete="current-password"
                className="input pl-10"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={submitting}
                required
              />
            </div>
          </div>
          <button
            type="submit"
            className="btn-primary w-full justify-center"
            disabled={submitting}
          >
            {submitting ? <Spinner size="sm" /> : null}
            {submitting ? "登入中…" : "登入"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-neutral-500">
          還不是合作店家？
          <Link
            to="/shop/onboarding"
            className="ml-1 font-semibold text-neutral-900 underline decoration-neutral-300 underline-offset-2"
          >
            申請加入
          </Link>
        </p>
      </div>
    </div>
  );
}
