import { getAdminClient } from '../lib/supabase';
import * as dotenv from 'dotenv';
import path from 'path';

// Load .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function initFlags() {
  const supabase = getAdminClient();
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
