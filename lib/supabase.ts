import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Url or Key");
}

const resolvedSupabaseUrl = supabaseUrl;
const resolvedSupabaseAnonKey = supabaseAnonKey;

export function createClerkSupabaseClient(
  getToken: () => Promise<string | null>,
) {
  return createClient(resolvedSupabaseUrl, resolvedSupabaseAnonKey, {
    async accessToken() {
      return getToken();
    },
  });
}
