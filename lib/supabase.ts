import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = 
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 
  "";

const isConfigured = 
  !!supabaseUrl && 
  !!supabaseAnonKey && 
  supabaseUrl !== "your-supabase-project-url" && 
  supabaseAnonKey !== "your-supabase-anon-key";

export const supabase = createClient(
  isConfigured ? supabaseUrl : "https://placeholder-project.supabase.co",
  isConfigured ? supabaseAnonKey : "placeholder-anon-key"
);

export function isSupabaseConfigured(): boolean {
  return isConfigured;
}
