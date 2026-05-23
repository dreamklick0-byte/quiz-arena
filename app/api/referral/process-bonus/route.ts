import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    const supabase = getAdminClient();
    const { userId, depositAmount } = await req.json();

    if (!userId || !depositAmount) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    // Find referral record where this user is the referee
    const { data: referral, error: refError } = await supabase
      .from("referrals")
      .select("*")
      .eq("referee_id", userId)
      .single();

    if (refError || !referral) {
      return NextResponse.json({ message: "No referral found" }, { status: 200 });
    }

    const referrerId = referral.referrer_id;
    const isFirstDeposit = !referral.first_deposit_bonus_paid;
    const bonusRate = isFirstDeposit ? 0.05 : 0.005;
    const bonusAmount = Math.floor(depositAmount * bonusRate);

    if (bonusAmount <= 0) {
      return NextResponse.json({ message: "Bonus too small" }, { status: 200 });
    }

    // Credit referrer wallet
    const { data: wallet } = await supabase
      .from("wallets")
      .select("balance")
      .eq("user_id", referrerId)
      .single();

    if (!wallet) {
      return NextResponse.json({ error: "Referrer wallet not found" }, { status: 404 });
    }

    await supabase
      .from("wallets")
      .update({ balance: wallet.balance + bonusAmount })
      .eq("user_id", referrerId);

    // Log the earning
    await supabase.from("referral_earnings").insert({
      referrer_id: referrerId,
      referee_id: userId,
      amount: bonusAmount,
      type: isFirstDeposit ? "first_deposit" : "recurring",
      deposit_amount: depositAmount,
    });

    // Mark first deposit bonus as paid
    if (isFirstDeposit) {
      await supabase
        .from("referrals")
        .update({ first_deposit_bonus_paid: true })
        .eq("id", referral.id);
    }

    // Update total bonus earned
    await supabase
      .from("referrals")
      .update({ total_bonus_earned: (referral.total_bonus_earned || 0) + bonusAmount })
      .eq("id", referral.id);

    return NextResponse.json({ success: true, bonusAmount });
  } catch (err) {
    console.error("process-bonus error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
