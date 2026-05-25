import { createClient, SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // In production, we don't want to crash the whole app, but we should log clearly
  if (typeof window !== 'undefined') {
    console.error("Supabase environment variables are missing! Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.");
  }
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder'
);

// Use a lazy initializer for the admin client to avoid errors on the client-side
let adminClient: SupabaseClient | null = null;

export function getSupabaseClient() {
  return supabase
}

export function getAdminClient() {
  if (typeof window !== 'undefined') {
    throw new Error('getAdminClient() can only be used on the server side.');
  }
  
  if (!adminClient) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!url || !key) {
      throw new Error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required for the admin client.');
    }
    
    adminClient = createClient(url, key);
  }
  
  return adminClient;
}