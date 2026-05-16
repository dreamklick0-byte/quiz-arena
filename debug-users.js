const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function checkUsers() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!url || !key) {
    console.error("Missing env vars");
    return;
  }
  
  const supabase = createClient(url, key);
  const { data, error } = await supabase.auth.admin.listUsers();
  
  if (error) {
    console.error("Error:", error);
  } else {
    console.log("User count:", data.users.length);
  }
}

checkUsers();
