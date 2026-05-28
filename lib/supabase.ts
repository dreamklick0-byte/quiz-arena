import { createClient, SupabaseClient } from '@supabase/supabase-js'; 
 
export const supabase = createClient( 
  process.env.NEXT_PUBLIC_SUPABASE_URL!, 
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY! 
); 
 
let adminClient: SupabaseClient | null = null; 
 
export function getSupabaseClient() { 
  return createClient( 
    process.env.NEXT_PUBLIC_SUPABASE_URL!, 
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY! 
  ); 
} 
 
export function getAdminClient() { 
  if (typeof window !== 'undefined') { 
    throw new Error('getAdminClient() can only be used on the server side.'); 
  } 
  if (!adminClient) { 
    adminClient = createClient( 
      process.env.NEXT_PUBLIC_SUPABASE_URL!, 
      process.env.SUPABASE_SERVICE_ROLE_KEY! 
    ); 
  } 
  return adminClient; 
} 
