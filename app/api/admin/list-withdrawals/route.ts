import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getAdminClient } from "@/lib/supabase";

export async function GET() { 
  try { 
    const cookieStore = await cookies(); 
    const adminSessionCookie = cookieStore.get("admin_session")?.value; 
    if (!adminSessionCookie) { 
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); 
    } 

    const supabase = getAdminClient();

    const { data: requests, error } = await supabase 
      .from("withdrawal_requests") 
      .select("*") 
      .order("created_at", { ascending: false }); 

    if (error) { 
      console.error("Error fetching withdrawals:", JSON.stringify(error)); 
      return NextResponse.json({ error: "Failed to fetch withdrawal requests", detail: error.message }, { status: 500 }); 
    } 

    // Fetch display names separately 
    const userIds = [...new Set((requests || []).map((r: any) => r.user_id))]; 
    const { data: profiles } = await supabase 
      .from("profiles") 
      .select("id, display_name") 
      .in("id", userIds.length > 0 ? userIds : ['00000000-0000-0000-0000-000000000000']); 

    const profileMap = Object.fromEntries((profiles || []).map((p: any) => [p.id, p])); 
    const enriched = (requests || []).map((r: any) => ({ 
      ...r, 
      profiles: profileMap[r.user_id] || null 
    })); 

    return NextResponse.json({ success: true, requests: enriched }); 
  } catch (err) {
    console.error("List withdrawals error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
