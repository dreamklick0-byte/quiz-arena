import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '../../../lib/supabase';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function selectWeightedSegment(segments: any[]): number {
  const totalWeight = segments.reduce((sum, s) => sum + s.weight, 0);
  let random = Math.random() * totalWeight;
  for (let i = 0; i < segments.length; i++) {
    random -= segments[i].weight;
    if (random <= 0) return i;
  }
  return segments.length - 1;
}

export async function GET(req: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const { data: existingSpin } = await supabase
      .from('daily_spins')
      .select('id, spun_at')
      .eq('user_id', user.id)
      .gte('spun_at', today.toISOString())
      .order('spun_at', { ascending: false })
      .limit(1)
      .single();

    const TESTING_MODE = process.env.SPIN_TESTING === 'true';

    if (existingSpin && !TESTING_MODE) {
      const lastSpin = new Date(existingSpin.spun_at);
      const nextSpinAt = new Date(lastSpin.getTime() + 24 * 60 * 60 * 1000);
      
      return NextResponse.json({ 
        eligible: false, 
        nextSpinAt: nextSpinAt.toISOString() 
      });
    }

    return NextResponse.json({ eligible: true });
  } catch (err) {
    console.error('Error in GET /api/spin-wheel:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 1. Check eligibility
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const { data: existingSpin } = await supabase
      .from('daily_spins')
      .select('id, spun_at')
      .eq('user_id', user.id)
      .gte('spun_at', today.toISOString())
      .order('spun_at', { ascending: false })
      .limit(1)
      .single();

    const TESTING_MODE = process.env.SPIN_TESTING === 'true';

    if (existingSpin && !TESTING_MODE) {
      const lastSpin = new Date(existingSpin.spun_at);
      const nextSpinAt = new Date(lastSpin.getTime() + 24 * 60 * 60 * 1000);
      
      return NextResponse.json({ 
        eligible: false, 
        nextSpinAt: nextSpinAt.toISOString() 
      });
    }

    // 2. Fetch segments
    const { data: segments, error: segError } = await supabase
      .from('wheel_segments')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: true });

    if (segError) throw segError;
    if (!segments || segments.length === 0) {
      return NextResponse.json({ error: 'No segments configured' }, { status: 500 });
    }

    // 3. Select segment
    const segmentIndex = selectWeightedSegment(segments);
    const selectedSegment = segments[segmentIndex];

    // 4. Record spin in daily_spins
    await supabase.from('daily_spins').insert({
      user_id: user.id,
      prize_label: selectedSegment.label,
      prize_amount: selectedSegment.amount,
      spun_at: new Date().toISOString()
    });

    // 5. Update wallet if cash prize
    if (selectedSegment.type === 'cash' && selectedSegment.amount > 0) {
      const { error: walletError } = await supabaseAdmin
        .rpc('increment_wallet_balance', {
          p_user_id: user.id,
          p_amount: selectedSegment.amount
        });
      
      if (walletError) console.error('Wallet update error:', walletError);
    }

    // 6. Return result
    return NextResponse.json({
      eligible: true,
      segmentIndex,
      prize: {
        label: selectedSegment.label,
        amount: selectedSegment.amount,
        type: selectedSegment.type,
        color: selectedSegment.color
      }
    });

  } catch (err) {
    console.error('Error in /api/spin-wheel:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

