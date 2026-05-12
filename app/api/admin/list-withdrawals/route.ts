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
      .select(`
        *,
        profiles:user_id (display_name)
      `)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching withdrawals:", error);
      return NextResponse.json({ error: "Failed to fetch withdrawal requests" }, { status: 500 });
    }

    return NextResponse.json({ success: true, requests });
  } catch (err) {
    console.error("List withdrawals error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
