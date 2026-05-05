import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  console.warn(
    "[supabase] VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY missing. " +
      "Set them in your .env file before running against a real backend.",
  );
}

export const supabase: SupabaseClient = createClient(
  url ?? "http://127.0.0.1:54321",
  anonKey ?? "public-anon-key",
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  },
);

export type SupabaseError = { message: string; code?: string };

export function formatSupabaseError(err: unknown): string {
  if (!err) return "未知錯誤";
  if (typeof err === "string") return err;
  if (err instanceof Error) return err.message;
  if (typeof err === "object" && "message" in err) {
    return String((err as SupabaseError).message);
  }
  return "未知錯誤";
}
