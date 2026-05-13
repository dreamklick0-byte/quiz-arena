import { NextRequest, NextResponse } from 'next/server' 
import { createClient } from '@supabase/supabase-js' 
 
export async function GET(request: NextRequest) { 
  try { 
    const supabase = createClient( 
      process.env.NEXT_PUBLIC_SUPABASE_URL!, 
      process.env.SUPABASE_SERVICE_ROLE_KEY! 
    ) 
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
      return NextResponse.redirect(new URL(`/account/wallet?success=true&amount=${amount}`, request.url)) 
    } 
 
    const { error: rpcError } = await supabase.rpc('increment_wallet_balance', { 
      p_user_id: userId, 
      p_amount: amount 
    }) 
    console.log('rpc error:', rpcError) 
 
    await supabase.from('transactions').insert({ 
      user_id: userId, 
      type: 'deposit', 
      amount: amount, 
      reference: reference, 
      description: 'Wallet Deposit via Paystack', 
      status: 'completed' 
    }) 
 
    return NextResponse.redirect(new URL(`/account/wallet?success=true&amount=${amount}`, request.url)) 
 
  } catch (err) { 
    console.error('Payment verify error:', err) 
    return NextResponse.json({ status: false, message: 'Server error: ' + err }, { status: 500 }) 
  } 
} 
 
export async function POST(request: NextRequest) { 
  return GET(request) 
} 
