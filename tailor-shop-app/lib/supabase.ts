import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

let browserClient: ReturnType<typeof createClient<any>> | null = null;

export function getSupabaseClient() {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Add Supabase URL and anon key in .env.local.");
  }

  if (!browserClient) {
    browserClient = createClient<any>(supabaseUrl, supabaseAnonKey);
  }

  return browserClient;
}
