import { NextResponse } from "next/server"; 
 import { createClient } from "@supabase/supabase-js"; 
 import { COIN_ECONOMY, calcBattleCoinWithdrawal, calcRewardCoinWithdrawal } from "@/lib/coinEconomy"; 
 
 export async function POST(req: Request) { 
   const supabase = createClient( 
     process.env.NEXT_PUBLIC_SUPABASE_URL!, 
     process.env.SUPABASE_SERVICE_ROLE_KEY! 
   ); 
   try { 
     const { userId, coinAmount, coinType } = await req.json(); 
 
     if (!coinAmount || coinAmount < COIN_ECONOMY.MIN_WITHDRAWAL_COINS) { 
       return NextResponse.json({ 
         error: `Minimum withdrawal is ${COIN_ECONOMY.MIN_WITHDRAWAL_COINS} coins` 
       }, { status: 400 }); 
     } 
 
     if (coinType !== 'battle' && coinType !== 'reward') { 
       return NextResponse.json({ error: 'Invalid coin type' }, { status: 400 }); 
     } 
 
     const rpcName = coinType === 'battle' ? 'withdraw_battle_coins' : 'withdraw_reward_coins'; 
     const { data: result } = await supabase.rpc(rpcName, { 
       p_user_id: userId, 
       p_amount: coinAmount 
     }); 
 
     if (!result?.success) { 
       return NextResponse.json({ error: result?.error || 'Withdrawal failed' }, { status: 400 }); 
     } 
 
     await supabase.rpc('increment_wallet_balance', { 
       p_user_id: userId, 
       p_amount: result.naira_amount 
     }); 
 
     const calc = coinType === 'battle' 
       ? calcBattleCoinWithdrawal(coinAmount) 
       : calcRewardCoinWithdrawal(coinAmount); 
 
     await supabase.from('coin_transactions').insert({ 
       user_id: userId, 
       type: `withdraw_${coinType}_coins`, 
       battle_coins_change: coinType === 'battle' ? -coinAmount : 0, 
       reward_coins_change: coinType === 'reward' ? -coinAmount : 0, 
       fee_coins: calc.fee, 
       naira_equivalent: calc.naira, 
       reference: `coin-withdraw-${coinType}-${userId}-${Date.now()}`, 
       description: coinType === 'battle' 
         ? `Withdrew ${coinAmount} Battle Coins → ₦${calc.naira} (25% fee applied)` 
         : `Withdrew ${coinAmount} Reward Coins → ₦${calc.naira} (no fee)` 
     }); 
 
     return NextResponse.json({ 
       success: true, 
       nairaAdded: result.naira_amount, 
       feeCoins: result.fee_coins, 
       netCoins: result.net_coins 
     }); 
   } catch (err) { 
     return NextResponse.json({ error: (err as Error).message }, { status: 500 }); 
   } 
 } 
