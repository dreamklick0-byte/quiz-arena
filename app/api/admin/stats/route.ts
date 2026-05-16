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
    const [adminsCount, withdrawalsCount, questionsCount, leaguesCount, platformStats] = await Promise.all([
      supabase.from("admin_accounts").select("*", { count: 'exact', head: true }),
      supabase.from("withdrawal_requests").select("*", { count: 'exact', head: true }).eq("status", "pending"),
      supabase.from("questions").select("*", { count: 'exact', head: true }),
      supabase.from("leagues").select("*", { count: 'exact', head: true }).eq("status", "open"),
      supabase.rpc('get_platform_stats')
    ]);

    const totalRevenue = platformStats.data?.total_revenue || 0;
    const totalPayouts = platformStats.data?.total_payouts || 0;

    return NextResponse.json({
      success: true,
      stats: {
        admins: adminsCount.count || 0,
        withdrawals: withdrawalsCount.count || 0,
        questions: questionsCount.count || 0,
        leagues: leaguesCount.count || 0,
        totalRevenue,
        totalPayouts
      }
    });
  } catch (err) {
    console.error("Stats error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
