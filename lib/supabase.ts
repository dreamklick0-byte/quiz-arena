import { createClient, SupabaseClient } from '@supabase/supabase-js'; 
 
let _supabase: SupabaseClient | null = null; 
let _adminClient: SupabaseClient | null = null; 
 
export function getSupabaseClient(): SupabaseClient { 
  if (!_supabase) { 
    _supabase = createClient( 
      process.env.NEXT_PUBLIC_SUPABASE_URL!, 
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY! 
    ); 
  } 
  return _supabase; 
} 
 
export function getAdminClient(): SupabaseClient { 
  if (typeof window !== 'undefined') { 
    throw new Error('getAdminClient() can only be used on the server side.'); 
  } 
  if (!_adminClient) { 
    _adminClient = createClient( 
      process.env.NEXT_PUBLIC_SUPABASE_URL!, 
      process.env.SUPABASE_SERVICE_ROLE_KEY! 
    ); 
  } 
  return _adminClient; 
} 
 
export const supabase = { 
  get client() { return getSupabaseClient(); }, 
  from: (...args: Parameters<SupabaseClient['from']>) => getSupabaseClient().from(...args), 
  auth: new Proxy({} as SupabaseClient['auth'], { 
    get(_t, prop) { 
      return (getSupabaseClient().auth as any)[prop]; 
    } 
  }), 
  channel: (...args: Parameters<SupabaseClient['channel']>) => getSupabaseClient().channel(...args), 
  removeChannel: (...args: Parameters<SupabaseClient['removeChannel']>) => getSupabaseClient().removeChannel(...args), 
  rpc: (...args: Parameters<SupabaseClient['rpc']>) => getSupabaseClient().rpc(...args), 
}; 
