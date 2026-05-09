import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://viayjjutczrqxtmvbzwt.supabase.co',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZpYXlqanV0Y3pycXh0bXZiend0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc5NDg3OTgsImV4cCI6MjA5MzUyNDc5OH0.-Q3yXLFLYqGbBVSD27bsFJMiMq6XXSIVuWNtUWLiy3M'
)

export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://viayjjutczrqxtmvbzwt.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

export function getSupabaseClient() {
  return supabase
}

export function getAdminClient() {
  return supabaseAdmin
}