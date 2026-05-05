import { createClient } from "https://esm.sh/@supabase/supabase-js@2.46.1";

/**
 * Service-role client for use inside Edge Functions.
 * Bypasses RLS — use with care, only inside server-side functions.
 */
export function adminClient() {
  const url = Deno.env.get("SUPABASE_URL")!;
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
