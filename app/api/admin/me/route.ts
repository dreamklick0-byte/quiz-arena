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

    const sessionData = JSON.parse(adminSessionCookie);
    
    // Fetch latest data from DB to ensure role and status are up to date
    const supabase = getAdminClient();
    const { data: admin, error } = await supabase
      .from("admin_accounts")
      .select("id, username, role, full_name, is_active, last_login")
      .eq("id", sessionData.id)
      .single();

    if (error || !admin || !admin.is_active) {
      return NextResponse.json({ error: "Unauthorized or account deactivated" }, { status: 401 });
    }

    return NextResponse.json({ success: true, admin });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
