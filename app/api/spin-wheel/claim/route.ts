import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '../../../lib/supabase';
import { jwtVerify } from 'jose';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const SPIN_WHEEL_SECRET = process.env.SPIN_WHEEL_SECRET || 'default-spin-wheel-secret-change-me';

export async function POST(req: NextRequest) {
  try {
    const { spinToken } = await req.json();

    if (!spinToken) {
      return NextResponse.json({ error: 'Missing spinToken' }, { status: 400 });
    }

    const supabase = getSupabaseClient();
    const secret = new TextEncoder().encode(SPIN_WHEEL_SECRET);

    // 1. Verify JWT
    let payload;
    try {
      const { payload: verifiedPayload } = await jwtVerify(spinToken, secret);
      payload = verifiedPayload;
    } catch (err) {
      return NextResponse.json({ error: 'Invalid or expired spin token' }, { status: 400 });
    }

    const { userId, attemptId, reward } = payload as any;

    // 2. Check and update spin attempt
    const { data: attempt, error: attemptError } = await supabase
      .from('spin_attempts')
      .select('*')
      .eq('id', attemptId)
      .eq('user_id', userId)
      .single();

    if (attemptError || !attempt) {
      return NextResponse.json({ error: 'Spin attempt not found' }, { status: 404 });
    }

    if (attempt.claimed) {
      return NextResponse.json({ error: 'Reward already claimed' }, { status: 400 });
    }

    // 3. Mark as claimed and update last_spin_at
    const { error: updateAttemptError } = await supabase
      .from('spin_attempts')
      .update({ claimed: true })
      .eq('id', attemptId);

    if (updateAttemptError) throw updateAttemptError;

    const { error: profileUpdateError } = await supabase
      .from('profiles')
      .update({ last_spin_at: new Date().toISOString() })
      .eq('id', userId);

    if (profileUpdateError) throw profileUpdateError;

    // 4. Apply reward
    let newWalletBalance = 0;
    
    if (reward.type === 'cash' && reward.amount > 0) {
      await supabaseAdmin.rpc('increment_wallet_balance', {
        p_user_id: userId,
        p_amount: reward.amount
      });
      
      const { data: wallet } = await supabaseAdmin
        .from('wallets')
        .select('balance')
        .eq('user_id', userId)
        .single();
      
      newWalletBalance = wallet?.balance || 0;
    } else if (reward.type === 'xp' && reward.amount > 0) {
      const { data: xpRow } = await supabase.from("user_xp").select("xp").eq("user_id", userId).maybeSingle();
      const current = xpRow?.xp || 0;
      const newXP = current + reward.amount;
      await supabase.from("user_xp").upsert({ user_id: userId, xp: newXP }, { onConflict: "user_id" });
      
      const { data: wallet } = await supabaseAdmin
        .from('wallets')
        .select('balance')
        .eq('user_id', userId)
        .single();
      newWalletBalance = wallet?.balance || 0;
    } else {
      const { data: wallet } = await supabaseAdmin
        .from('wallets')
        .select('balance')
        .eq('user_id', userId)
        .single();
      newWalletBalance = wallet?.balance || 0;
    }

    return NextResponse.json({
      success: true,
      newWalletBalance,
      reward
    });

  } catch (err) {
    console.error('Error in /api/spin-wheel/claim:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

