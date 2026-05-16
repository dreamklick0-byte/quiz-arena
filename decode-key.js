require('dotenv').config({ path: '.env.local' });
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (key) {
  try {
    const payload = JSON.parse(Buffer.from(key.split('.')[1], 'base64').toString());
    console.log("Ref in Key:", payload.ref);
  } catch (e) {
    console.error("Decode error");
  }
} else {
  console.error("No key found");
}
