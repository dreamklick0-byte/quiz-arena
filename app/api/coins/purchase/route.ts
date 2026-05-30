import { NextResponse } from "next/server"; 
 import { createClient } from "@supabase/supabase-js"; 
 import { COIN_ECONOMY } from "@/lib/coinEconomy"; 
 
 export async function POST(req: Request) { 
   const supabase = createClient( 
     process.env.NEXT_PUBLIC_SUPABASE_URL!, 
     process.env.SUPABASE_SERVICE_ROLE_KEY! 
   ); 
   try { 
     const { userId, packageIndex } = await req.json(); 
     const pkg = COIN_ECONOMY.PACKAGES[packageIndex]; 
     if (!pkg) return NextResponse.json({ error: 'Invalid package' }, { status: 400 }); 
 
     const totalCoins = pkg.battleCoins + pkg.bonus; 
 
     const { data: wallet } = await supabase 
       .from('wallets') 
       .select('balance') 
       .eq('user_id', userId) 
       .single(); 
 
     if (!wallet || Number(wallet.balance) < pkg.naira) { 
       return NextResponse.json({ 
         error: `Insufficient balance. You need ₦${pkg.naira} but have ₦${Number(wallet?.balance ?? 0)}.` 
       }, { status: 400 }); 
     } 
 
     await supabase 
       .from('wallets') 
       .update({ 
         balance: Number(wallet.balance) - pkg.naira, 
         updated_at: new Date().toISOString() 
       }) 
       .eq('user_id', userId); 
 
     await supabase.rpc('increment_battle_coins', { 
       p_user_id: userId, 
       p_amount: totalCoins 
     }); 
 
     await supabase.from('coin_transactions').insert({ 
       user_id: userId, 
       type: 'purchase', 
       battle_coins_change: totalCoins, 
       reward_coins_change: 0, 
       fee_coins: 0, 
       naira_equivalent: pkg.naira, 
       reference: `coin-purchase-${userId}-${Date.now()}`, 
       description: `Purchased ${pkg.label}: ${totalCoins} Battle Coins for ₦${pkg.naira}` 
     }); 
 
     return NextResponse.json({ success: true, coinsAdded: totalCoins }); 
   } catch (err) { 
     return NextResponse.json({ error: (err as Error).message }, { status: 500 }); 
   } 
 } 
