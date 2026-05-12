import bcrypt from 'bcryptjs'; 
import { createClient } from '@supabase/supabase-js'; 
import dotenv from 'dotenv';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

const supabase = createClient( 
  process.env.NEXT_PUBLIC_SUPABASE_URL, 
  process.env.SUPABASE_SERVICE_ROLE_KEY 
); 

async function setupSuperAdmin() {
  const password = 'SuperAdmin@2024!'; 
  const hash = await bcrypt.hash(password, 10); 

  console.log('Attempting to create super admin...');

  const { data, error } = await supabase 
    .from('admin_accounts') 
    .upsert({ 
      username: 'superadmin', 
      password_hash: hash, 
      full_name: 'Super Administrator', 
      role: 'super_admin', 
      is_active: true 
    }, { onConflict: 'username' }); 

  if (error) {
    console.error('Error:', error.message); 
  } else {
    console.log('Super admin created successfully!'); 
  }
}

setupSuperAdmin();
