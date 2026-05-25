import { createClient, SupabaseClient } from "@supabase/supabase-js"; 

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!; 
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!; 

export const supabase = createClient(supabaseUrl, supabaseAnonKey); 

let adminClient: SupabaseClient | null = null; 

export function getSupabaseClient() { 
  return supabase; 
} 

export function getAdminClient() { 
  if (typeof window !== "undefined") { 
    throw new Error("getAdminClient() can only be used on the server side."); 
  } 
  if (!adminClient) { 
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!; 
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY!; 
    adminClient = createClient(url, key); 
  } 
  return adminClient; 
} 
