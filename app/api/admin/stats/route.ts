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

    // Fetch stats in parallel
    const [adminsCount, withdrawalsCount, questionsCount] = await Promise.all([
      supabase.from("admin_accounts").select("*", { count: 'exact', head: true }),
      supabase.from("withdrawal_requests").select("*", { count: 'exact', head: true }).eq("status", "pending"),
      supabase.from("questions").select("*", { count: 'exact', head: true })
    ]);

    return NextResponse.json({
      success: true,
      stats: {
        admins: adminsCount.count || 0,
        withdrawals: withdrawalsCount.count || 0,
        questions: questionsCount.count || 0
      }
    });
  } catch (err) {
    console.error("Stats error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
