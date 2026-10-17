import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL ?? "https://tufvaozdbbhdiiyrxtlh.supabase.co";
// A publishable key is designed for browser use and is protected by Supabase Auth and RLS.
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? "sb_publishable_RuYJr-f2767LXJTp4Ki7Sw_CT-1GUbf";

export const supabase = createClient(url, publishableKey, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});
