import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import * as dotenv from 'dotenv';
import path from 'path';

// Load .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey || supabaseServiceKey === 'YOUR_SERVICE_ROLE_KEY_HERE') {
  console.error('Error: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createSuperAdmin() {
  const username = 'superadmin';
  const password = 'SuperAdmin@2024!';
  const fullName = 'Super Administrator';
  const role = 'super_admin';

  console.log(`Generating hash for ${username}...`);
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(password, salt);

  console.log('Inserting super admin into admin_accounts...');
  
  const { data, error } = await supabase
    .from('admin_accounts')
    .upsert({
      username,
      password_hash: passwordHash,
      role,
      full_name: fullName,
      is_active: true
    }, { onConflict: 'username' })
    .select();

  if (error) {
    console.error('Error creating super admin:', error.message);
    return;
  }

  console.log('Super admin created/updated successfully:', data);
}

createSuperAdmin();
