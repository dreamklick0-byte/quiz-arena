import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase";

const FIRST_DEPOSIT_RATE = 0.05;   // 5% of first deposit
const RECURRING_RATE = 0.005;      // 0.5% of every future deposit

// Called from verify/route.ts after every successful deposit
export async function POST(req: NextRequest) {
  try {
    const supabase = getAdminClient();
    const { userId, depositAmount } = await req.json();

    if (!userId || !depositAmount) {
      return NextResponse.json({ success: false, message: "Missing fields." });
    }

    // Check if this user was referred
    const { data: referral } = await supabase
      .from("referrals")
      .select("id, referrer_id, first_deposit_bonus_paid, total_bonus_earned")
      .eq("referee_id", userId)
      .maybeSingle();

    if (!referral) {
      // No referral found — nothing to do
      return NextResponse.json({ success: true, message: "No referral found." });
    }

    const isFirstDeposit = !referral.first_deposit_bonus_paid;
    const rate = isFirstDeposit ? FIRST_DEPOSIT_RATE : RECURRING_RATE;
    const bonusAmount = Math.floor(depositAmount * rate);

    if (bonusAmount <= 0) {
      return NextResponse.json({ success: true, message: "Bonus too small." });
    }

    // Credit referrer's wallet
    const { data: referrerWallet } = await supabase
      .from("wallets")
      .select("id, balance")
      .eq("user_id", referral.referrer_id)
      .single();

    if (!referrerWallet) {
      return NextResponse.json({ success: false, message: "Referrer wallet not found." });
    }

    await supabase
      .from("wallets")
      .update({ balance: referrerWallet.balance + bonusAmount })
      .eq("user_id", referral.referrer_id);

    // Log the earning
    await supabase.from("referral_earnings").insert({
      referrer_id: referral.referrer_id,
      referee_id: userId,
      amount: bonusAmount,
      type: isFirstDeposit ? "first_deposit" : "recurring",
      deposit_amount: depositAmount,
    });

    // Update referral record
    await supabase
      .from("referrals")
      .update({
        first_deposit_bonus_paid: true,
        total_bonus_earned: referral.total_bonus_earned + bonusAmount,
      })
      .eq("id", referral.id);

    return NextResponse.json({
      success: true,
      bonusAmount,
      type: isFirstDeposit ? "first_deposit" : "recurring",
    });
  } catch (err) {
    const error = err as Error;
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}