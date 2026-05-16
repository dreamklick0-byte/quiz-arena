import { NextResponse } from "next/server"; 
import { cookies } from "next/headers"; 
import { getAdminClient } from "@/lib/supabase"; 
 
export const dynamic = 'force-dynamic'; 
 
export async function GET() { 
  try { 
    const cookieStore = await cookies(); 
    const adminSessionCookie = cookieStore.get("admin_session")?.value; 
    if (!adminSessionCookie) { 
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 }); 
    } 
 
    const supabase = getAdminClient(); 
 
    const { data: users, error } = await supabase
      .from("admin_users_view")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) { 
      console.error("Fetch users error:", error); 
      return NextResponse.json({ success: false, error: error.message }, { status: 500 }); 
    } 
 
    return NextResponse.json({ success: true, users }); 
  } catch (err: any) { 
    console.error("List users error:", err); 
    return NextResponse.json({ success: false, error: err.message }, { status: 500 }); 
  } 
} 
