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
      return NextResponse.redirect( 
        new URL('/account/wallet?status=error&message=Missing+parameters', request.url) 
      ) 
    } 
 
    const paystackRes = await fetch( 
      `https://api.paystack.co/transaction/verify/${reference}`, 
      { headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` } } 
    ) 
    const paystackData = await paystackRes.json() 
 
    if (!paystackData.status || paystackData.data.status !== 'success') { 
      return NextResponse.redirect( 
        new URL('/account/wallet?status=error&message=Payment+verification+failed', request.url) 
      ) 
    } 
 
    const amount = paystackData.data.amount / 100 
 
    const { data: existingTx } = await supabase 
      .from('transactions') 
      .select('id') 
      .eq('reference', reference) 
      .single() 
 
    if (existingTx) { 
      return NextResponse.redirect( 
        new URL('/account/wallet?status=success&amount=' + amount, request.url) 
      ) 
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
 
    return NextResponse.redirect( 
      new URL('/account/wallet?status=success&amount=' + amount, request.url) 
    ) 
 
  } catch (err) { 
    console.error('Payment verify error:', err) 
    return NextResponse.redirect( 
      new URL('/account/wallet?status=error&message=Server+error', request.url) 
    ) 
  } 
} 
