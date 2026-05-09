import { createClient, SupabaseClient } from '@supabase/supabase-js'

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://viayjjutczrqxtmvbzwt.supabase.co',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZpYXlqanV0Y3pycXh0bXZiend0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc5NDg3OTgsImV4cCI6MjA5MzUyNDc5OH0.-Q3yXLFLYqGbBVSD27bsFJMiMq6XXSIVuWNtUWLiy3M'
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