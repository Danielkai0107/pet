import { createContext } from "react";
import type { Session, User } from "@supabase/supabase-js";
import type { Shop, ShopMember } from "@/lib/types";

export interface ShopAuthState {
  loading: boolean;
  session: Session | null;
  user: User | null;
  member: ShopMember | null;
  shop: Shop | null;
  ready: boolean;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
}

export const ShopAuthCtx = createContext<ShopAuthState | undefined>(undefined);
