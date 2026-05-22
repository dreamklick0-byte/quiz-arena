import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const PRIZES = [
  { label: "₦20", amount: 20, type: "cash" },
  { label: "₦50", amount: 50, type: "cash" },
  { label: "₦70", amount: 70, type: "cash" },
  { label: "₦100", amount: 100, type: "cash" },
  { label: "₦30", amount: 30, type: "cash" },
  { label: "₦110", amount: 110, type: "cash" },
  { label: "₦60", amount: 60, type: "cash" },
  { label: "2× Spin", amount: 0, type: "xp" },
];

export async function POST(req: NextRequest) {
  try {
    const { userId } = await req.json()

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 })
    }

    // Check 24hr cooldown
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const { data: recentSpin } = await supabase
      .from('daily_spins')
      .select('spun_at')
      .eq('user_id', userId)
      .gte('spun_at', since)
      .order('spun_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (recentSpin) {
      const nextSpin = new Date(new Date(recentSpin.spun_at).getTime() + 24 * 60 * 60 * 1000)
      return NextResponse.json({
        error: 'Already spun today',
        nextSpinAt: nextSpin.toISOString(),
      }, { status: 429 })
    }

    // Pick random prize
    const prize = PRIZES[Math.floor(Math.random() * PRIZES.length)]

    // Credit wallet if cash prize
    if (prize.type === 'cash' && prize.amount > 0) {
      const { data: wallet } = await supabase
        .from('wallets')
        .select('balance')
        .eq('user_id', userId)
        .single()

      if (wallet) {
        await supabase
          .from('wallets')
          .update({ balance: wallet.balance + prize.amount })
          .eq('user_id', userId)
      } else {
        await supabase
          .from('wallets')
          .insert({ user_id: userId, balance: prize.amount })
      }

      // Log transaction
      await supabase.from('transactions').insert({
        user_id: userId,
        type: 'bonus',
        amount: prize.amount,
        reference: `spin_${Date.now()}`,
        description: `Daily Spin Win: ${prize.label}`,
        status: 'completed',
      })
    }

    // Record spin
    await supabase.from('daily_spins').insert({
      user_id: userId,
      prize_label: prize.label,
      prize_amount: prize.amount,
      prize_type: prize.type,
    })

    return NextResponse.json({ success: true, prize })

  } catch (err) {
    console.error('Spin error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 })
    }

    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const { data: recentSpin } = await supabase
      .from('daily_spins')
      .select('spun_at')
      .eq('user_id', userId)
      .gte('spun_at', since)
      .order('spun_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (recentSpin) {
      const nextSpin = new Date(new Date(recentSpin.spun_at).getTime() + 24 * 60 * 60 * 1000)
      return NextResponse.json({ canSpin: false, nextSpinAt: nextSpin.toISOString() })
    }

    return NextResponse.json({ canSpin: true })

  } catch (err) {
    console.error('Spin check error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}