import { createContext } from "react";
import type { Customer } from "@/lib/types";
import type { LiffProfile } from "@/lib/line";

export interface LiffAuthState {
  ready: boolean;
  inLine: boolean;
  hasLiffId: boolean;
  loggedIn: boolean;
  profile: LiffProfile | null;
  idToken: string | null;
  customer: Customer | null;
  error: string | null;
  login: () => Promise<void>;
  refresh: () => Promise<void>;
}

export const LiffAuthCtx = createContext<LiffAuthState | undefined>(undefined);
