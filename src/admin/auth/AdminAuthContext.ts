import { createContext } from "react";
import type { Session, User } from "@supabase/supabase-js";
import type { Admin } from "@/lib/types";

export interface AdminAuthState {
  ready: boolean;
  loading: boolean;
  session: Session | null;
  user: User | null;
  admin: Admin | null;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
}

export const AdminAuthCtx = createContext<AdminAuthState | undefined>(undefined);
