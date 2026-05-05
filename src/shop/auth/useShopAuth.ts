import { useContext } from "react";
import { ShopAuthCtx, type ShopAuthState } from "./ShopAuthContext";

export function useShopAuth(): ShopAuthState {
  const ctx = useContext(ShopAuthCtx);
  if (!ctx) {
    throw new Error("useShopAuth must be used inside <ShopAuthProvider>");
  }
  return ctx;
}
