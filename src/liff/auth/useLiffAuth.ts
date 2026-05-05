import { useContext } from "react";
import { LiffAuthCtx, type LiffAuthState } from "./LiffAuthContext";

export function useLiffAuth(): LiffAuthState {
  const ctx = useContext(LiffAuthCtx);
  if (!ctx) {
    throw new Error("useLiffAuth must be used inside <LiffAuthProvider>");
  }
  return ctx;
}
