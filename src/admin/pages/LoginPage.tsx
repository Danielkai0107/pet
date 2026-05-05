import { useState, type FormEvent } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { Spinner } from "@/components/Spinner";
import { supabase, formatSupabaseError } from "@/lib/supabase";
import { PLATFORM_NAME } from "@/lib/constants";
import { useAdminAuth } from "@/admin/auth/useAdminAuth";

export function AdminLoginPage() {
  const { ready, user, admin } = useAdminAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const from =
    (location.state as { from?: string } | null)?.from ?? "/admin/shops";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (ready && user && admin) {
    return <Navigate to={from} replace />;
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setSubmitting(false);
    if (error) {
      toast.error(formatSupabaseError(error));
      return;
    }
    toast.success("登入成功");
    navigate(from, { replace: true });
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
          <span className="text-xs font-semibold uppercase tracking-wider text-brand-700">
            Super Admin
          </span>
        </Link>
        <h1 className="text-2xl font-bold tracking-tight text-neutral-900">
          超級管理員登入
        </h1>
        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <input
            type="email"
            className="input"
            placeholder="Email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            className="input"
            placeholder="密碼"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button
            className="btn-primary w-full justify-center"
            type="submit"
            disabled={submitting}
          >
            {submitting && <Spinner size="sm" />}
            登入
          </button>
        </form>
      </div>
    </div>
  );
}
