import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getAdminClient } from "@/lib/supabase";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("id");

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    const cookieStore = await cookies();
    const adminSessionCookie = cookieStore.get("admin_session")?.value;
    if (!adminSessionCookie) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = getAdminClient();

    // Fetch profile details in parallel
    const [battles, deposits, withdrawals, referrals, practice] = await Promise.all([
      supabase
        .from("battle_rooms")
        .select("id, winner_id")
        .or(`host_id.eq.${userId},guest_id.eq.${userId}`),
      supabase
        .from("transactions")
        .select("amount")
        .eq("user_id", userId)
        .eq("type", "deposit"),
      supabase
        .from("transactions")
        .select("amount")
        .eq("user_id", userId)
        .eq("type", "withdrawal"),
      supabase
        .from("referrals")
        .select("id")
        .eq("referrer_id", userId),
      supabase
        .from("practice_sessions")
        .select("id")
        .eq("user_id", userId)
    ]);

    const battlesPlayed = battles.data?.length || 0;
    const battlesWon = battles.data?.filter((b: any) => b.winner_id === userId).length || 0;
    const totalDeposits = (deposits.data || []).reduce((sum: number, t: any) => sum + (t.amount || 0), 0);
    const totalWithdrawals = (withdrawals.data || []).reduce((sum: number, t: any) => sum + (t.amount || 0), 0);

    return NextResponse.json({
      success: true,
      data: {
        battles_played: battlesPlayed,
        battles_won: battlesWon,
        battles_lost: battlesPlayed - battlesWon,
        total_deposits: totalDeposits,
        total_withdrawals: totalWithdrawals,
        referral_count: referrals.data?.length || 0,
        practice_sessions: practice.data?.length || 0,
      }
    });
  } catch (err: any) {
    console.error("User profile fetch error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
