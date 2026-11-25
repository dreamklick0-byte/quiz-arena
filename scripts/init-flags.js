const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Error: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
  process.exit(1);
}

console.log('URL:', supabaseUrl);
console.log('Key:', supabaseServiceKey ? 'Exists' : 'Missing');

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function initFlags() {
  const { data, error } = await supabase
    .from('platform_settings')
    .upsert([
      { 
        key: 'staking_enabled', 
        value: 'false', 
        description: 'When true, paid battle staking is visible to users' 
      },
      { 
        key: 'free_daily_battles', 
        value: '2', 
        description: 'Number of free battles allowed per day when staking is enabled' 
      }
    ], { onConflict: 'key' })
    .select();

  if (error) {
    console.error('Error initializing flags:', error.message);
  } else {
    console.log('Flags initialized successfully:', data);
  }
}

initFlags();
