import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const reference = searchParams.get('reference')
    const userId = searchParams.get('userId')

    if (!reference || !userId) {
      return NextResponse.json({ status: false, message: 'Missing parameters' })
    }

    const paystackRes = await fetch(
      `https://api.paystack.co/transaction/verify/${reference}`,
      { headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` } }
    )
    const paystackData = await paystackRes.json()

    if (!paystackData.status || paystackData.data.status !== 'success') {
      return NextResponse.json({ status: false, message: 'Payment verification failed' })
    }

    const amount = paystackData.data.amount / 100

    const { data: existingTx } = await supabase
      .from('transactions')
      .select('id')
      .eq('reference', reference)
      .single()

    if (existingTx) {
      return NextResponse.json({ status: true, message: 'Already processed', amount })
    }

    const { data: wallet } = await supabase
      .from('wallets')
      .select('balance')
      .eq('user_id', userId)
      .single()

    if (!wallet) {
      await supabase.from('wallets').insert({ user_id: userId, balance: amount })
    } else {
      await supabase.from('wallets').update({ balance: wallet.balance + amount }).eq('user_id', userId)
    }

    await supabase.from('transactions').insert({
      user_id: userId,
      type: 'deposit',
      amount: amount,
      reference: reference,
      description: 'Wallet Deposit via Paystack',
      status: 'completed'
    })

    // ✅ REFERRAL BONUS HOOK — trigger after successful wallet credit
    try {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://quiz-arena-three.vercel.app'
      await fetch(`${appUrl}/api/referral/process-bonus`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, depositAmount: amount }),
      })
    } catch (bonusErr) {
      // Non-blocking — don't fail the payment if referral bonus errors
      console.error('Referral bonus hook failed:', bonusErr)
    }

    return NextResponse.json({ status: true, message: 'Wallet updated', amount })

  } catch (err) {
    console.error('Payment verify error:', err)
    return NextResponse.json({ status: false, message: 'Server error: ' + err }, { status: 500 })
  }
}