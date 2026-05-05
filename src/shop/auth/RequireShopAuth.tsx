import { Navigate, Outlet, useLocation } from "react-router-dom";
import { LoadingScreen } from "@/components/LoadingScreen";
import { useShopAuth } from "./useShopAuth";

/**
 * Guard that ensures a shop member is logged in and has at least one shop.
 * - Not logged in -> /shop/login
 * - Logged in but no shop yet -> /shop/onboarding
 */
export function RequireShopAuth() {
  const { ready, user, member } = useShopAuth();
  const location = useLocation();

  if (!ready) return <LoadingScreen label="檢查登入狀態…" />;

  if (!user) {
    return (
      <Navigate
        to="/shop/login"
        replace
        state={{ from: location.pathname + location.search }}
      />
    );
  }
  if (!member) {
    return <Navigate to="/shop/onboarding" replace />;
  }
  return <Outlet />;
}
