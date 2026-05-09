import { createClient, SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("CRITICAL: Supabase environment variables are missing! Check your .env.local or Vercel settings.");
}

export const supabase = createClient(
  supabaseUrl || '',
  supabaseAnonKey || ''
)

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
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://viayjjutczrqxtmvbzwt.supabase.co';
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!key) {
      throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for the admin client.');
    }
    
    adminClient = createClient(url, key);
  }
  
  return adminClient;
}