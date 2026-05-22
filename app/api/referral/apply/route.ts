import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Called when a new user signs up with a referral code
export async function POST(req: NextRequest) {
  try {
    const { userId, referralCode } = await req.json();

    if (!userId || !referralCode) {
      return NextResponse.json({ success: false, message: "Missing fields." }, { status: 400 });
    }

    // Find the referrer by referral code
    const { data: referrerProfile, error: profileErr } = await supabase
      .from("profiles")
      .select("id")
      .eq("referral_code", referralCode.toUpperCase())
      .single();

    if (profileErr || !referrerProfile) {
      return NextResponse.json({ success: false, message: "Invalid referral code." }, { status: 404 });
    }

    // Make sure user isn't referring themselves
    if (referrerProfile.id === userId) {
      return NextResponse.json({ success: false, message: "You cannot refer yourself." }, { status: 400 });
    }

    // Make sure this user hasn't already been referred
    const { data: existingReferral } = await supabase
      .from("referrals")
      .select("id")
      .eq("referee_id", userId)
      .maybeSingle();

    if (existingReferral) {
      return NextResponse.json({ success: false, message: "Already referred." }, { status: 400 });
    }

    // Save the referral relationship
    await supabase.from("referrals").insert({
      referrer_id: referrerProfile.id,
      referee_id: userId,
      first_deposit_bonus_paid: false,
      total_bonus_earned: 0,
    });

    // Save referred_by on the referee's profile (storing the CODE as per system requirements)
    await supabase
      .from("profiles")
      .update({ referred_by: referralCode.toUpperCase() })
      .eq("id", userId);

    return NextResponse.json({ success: true, message: "Referral applied successfully." });
  } catch (err) {
    const error = err as Error;
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}