import { useContext } from "react";
import { AdminAuthCtx, type AdminAuthState } from "./AdminAuthContext";

export function useAdminAuth(): AdminAuthState {
  const ctx = useContext(AdminAuthCtx);
  if (!ctx) {
    throw new Error("useAdminAuth must be used inside <AdminAuthProvider>");
  }
  return ctx;
}
