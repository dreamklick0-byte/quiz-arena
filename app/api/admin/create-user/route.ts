 import { createClient } from "@supabase/supabase-js"; 
 import { NextResponse } from "next/server"; 
 
 export async function POST(req: Request) { 
   try { 
     const { email, password, display_name } = await req.json(); 
     const supabase = createClient( 
       process.env.NEXT_PUBLIC_SUPABASE_URL!, 
       process.env.SUPABASE_SERVICE_ROLE_KEY! 
     ); 
     const { data, error } = await supabase.auth.admin.createUser({ 
       email, 
       password, 
       email_confirm: true, 
     }); 
     if (error) return NextResponse.json({ success: false, error: error.message }); 
     if (display_name && data.user) { 
       await supabase.from("profiles").upsert({ id: data.user.id, display_name }); 
     } 
     return NextResponse.json({ success: true }); 
   } catch (e: any) { 
     return NextResponse.json({ success: false, error: e.message }); 
   } 
 } 
