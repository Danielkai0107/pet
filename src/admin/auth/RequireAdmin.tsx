import { Navigate, Outlet, useLocation } from "react-router-dom";
import { LoadingScreen } from "@/components/LoadingScreen";
import { useAdminAuth } from "./useAdminAuth";

export function RequireAdmin() {
  const { ready, user, admin } = useAdminAuth();
  const location = useLocation();

  if (!ready) return <LoadingScreen label="檢查 Super Admin 身份…" />;
  if (!user) {
    return (
      <Navigate
        to="/admin/login"
        replace
        state={{ from: location.pathname + location.search }}
      />
    );
  }
  if (!admin) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="card max-w-md p-6 text-center">
          <h1 className="text-base font-bold text-slate-900">未授權</h1>
          <p className="mt-1 text-sm text-slate-500">
            您的帳號 ({user.email}) 不在 admins 表中。
          </p>
          <a href="/" className="btn-primary mt-4">回首頁</a>
        </div>
      </div>
    );
  }
  return <Outlet />;
}
