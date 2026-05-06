import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  'https://viayjjutczrqxtmvbzwt.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZpYXlqanV0Y3pycXh0bXZiend0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc5NDg3OTgsImV4cCI6MjA5MzUyNDc5OH0.-Q3yXLFLYqGbBVSD27bsFJMiMq6XXSIVuWNtUWLiy3M'
)

export function getSupabaseClient() {
  return supabase
}