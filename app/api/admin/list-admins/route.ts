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
    if (sessionData.role !== "super_admin") {
      return NextResponse.json({ error: "Access denied. Super Admin only." }, { status: 403 });
    }

    const supabase = getAdminClient();

    const { data: admins, error } = await supabase
      .from("admin_accounts")
      .select("id, username, full_name, email, role, is_active, last_login, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching admins:", error);
      return NextResponse.json({ error: "Failed to fetch admin accounts" }, { status: 500 });
    }

    return NextResponse.json({ success: true, admins });
  } catch (err) {
    console.error("List admins error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
