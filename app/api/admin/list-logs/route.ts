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

    const { data: logs, error } = await supabase
      .from("admin_logs")
      .select(`
        *,
        admin:admin_id (
          username,
          full_name
        )
      `)
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) {
      console.error("Error fetching logs:", error);
      return NextResponse.json({ error: "Failed to fetch activity logs" }, { status: 500 });
    }

    return NextResponse.json({ success: true, logs });
  } catch (err) {
    console.error("List logs error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
