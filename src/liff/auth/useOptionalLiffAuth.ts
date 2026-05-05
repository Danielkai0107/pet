import { useContext } from "react";
import { LiffAuthCtx, type LiffAuthState } from "./LiffAuthContext";

/**
 * Same as `useLiffAuth` but returns `null` when there is no LIFF provider
 * up the tree. Used by pages that are mounted under both `/web` and `/liff`
 * route trees and need to optionally enable LIFF-aware behaviour.
 */
export function useOptionalLiffAuth(): LiffAuthState | null {
  return useContext(LiffAuthCtx) ?? null;
}
