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
    const [adminsCount, withdrawalsCount, questionsCount, leaguesCount, revenueData, payoutsData] = await Promise.all([
      supabase.from("admin_accounts").select("*", { count: 'exact', head: true }),
      supabase.from("withdrawal_requests").select("*", { count: 'exact', head: true }).eq("status", "pending"),
      supabase.from("questions").select("*", { count: 'exact', head: true }),
      supabase.from("leagues").select("*", { count: 'exact', head: true }).eq("status", "open"),
      supabase.from("leagues").select("platform_revenue").eq("status", "completed"),
      supabase.from("withdrawal_requests").select("amount").eq("status", "processed")
    ]);

    const totalRevenue = (revenueData.data || []).reduce((sum, l) => sum + (l.platform_revenue || 0), 0);
    const totalPayouts = (payoutsData.data || []).reduce((sum, w) => sum + (w.amount || 0), 0);

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
