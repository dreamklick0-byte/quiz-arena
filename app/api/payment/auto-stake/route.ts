import { NextResponse } from "next/server"; 
 import { createClient } from "@supabase/supabase-js"; 
 
 export async function POST(req: Request) { 
   const supabase = createClient( 
     process.env.NEXT_PUBLIC_SUPABASE_URL!, 
     process.env.SUPABASE_SERVICE_ROLE_KEY! 
   ); 
   try { 
     const { userId, coinAmount, roomCode, description } = await req.json(); 
     if (!userId || !coinAmount) { 
       return NextResponse.json({ error: "Missing fields" }, { status: 400 }); 
     } 
 
     // Check current coin balance 
     const { data: coinWallet } = await supabase 
       .from("arena_coin_wallets") 
       .select("battle_coins, reward_coins") 
       .eq("user_id", userId) 
       .maybeSingle(); 
 
     const totalCoins = (coinWallet?.battle_coins ?? 0) + (coinWallet?.reward_coins ?? 0); 
 
     // If not enough coins, auto-buy coins from naira wallet silently 
     if (totalCoins < coinAmount) { 
       const coinsNeeded = coinAmount - totalCoins; 
 
       // Check naira balance 
       const { data: wallet } = await supabase 
         .from("wallets") 
         .select("balance") 
         .eq("user_id", userId) 
         .single(); 
 
       const nairaBalance = Number(wallet?.balance ?? 0); 
       if (nairaBalance < coinsNeeded) { 
         return NextResponse.json({ 
           error: `Not enough coins or balance. You need ${coinAmount} coins but have ${totalCoins} coins and ₦${nairaBalance}.` 
         }, { status: 400 }); 
       } 
 
       // Deduct naira and add battle coins silently 
       await supabase 
         .from("wallets") 
         .update({ balance: nairaBalance - coinsNeeded, updated_at: new Date().toISOString() }) 
         .eq("user_id", userId); 
 
       await supabase.rpc("increment_battle_coins", { 
         p_user_id: userId, 
         p_amount: coinsNeeded 
       }); 
 
       // Record the auto top-up 
       await supabase.from("coin_transactions").insert({ 
         user_id: userId, 
         type: "auto_topup", 
         battle_coins_change: coinsNeeded, 
         reward_coins_change: 0, 
         fee_coins: 0, 
         naira_equivalent: coinsNeeded, 
         reference: `auto-topup-${userId}-${Date.now()}`, 
         description: `Auto top-up: ${coinsNeeded} coins added from wallet` 
       }); 
     } 
 
     // Now deduct coins for the battle 
     const { data: deducted } = await supabase.rpc("deduct_coins_for_battle", { 
       p_user_id: userId, 
       p_amount: coinAmount 
     }); 
 
     if (!deducted) { 
       return NextResponse.json({ error: "Failed to deduct coins" }, { status: 400 }); 
     } 
 
     // Record the stake 
     await supabase.from("coin_transactions").insert({ 
       user_id: userId, 
       type: "battle_stake", 
       battle_coins_change: -coinAmount, 
       reward_coins_change: 0, 
       fee_coins: 0, 
       naira_equivalent: 0, 
       reference: `auto-stake-${roomCode}-${userId}-${Date.now()}`, 
       description: description || `Staked ${coinAmount} coins for room ${roomCode}` 
     }); 
 
     if (roomCode) { 
       await supabase 
         .from("battle_rooms") 
         .update({ use_coins: true, coin_stake: coinAmount }) 
         .eq("room_code", roomCode); 
     } 
 
     return NextResponse.json({ success: true }); 
   } catch (err) { 
     return NextResponse.json({ error: (err as Error).message }, { status: 500 }); 
   } 
 } 
