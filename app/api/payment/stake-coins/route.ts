import { NextResponse } from "next/server"; 
 import { createClient } from "@supabase/supabase-js"; 
 
 export async function POST(req: Request) { 
   const supabase = createClient( 
     process.env.NEXT_PUBLIC_SUPABASE_URL!, 
     process.env.SUPABASE_SERVICE_ROLE_KEY! 
   ); 
   try { 
     const { userId, coinAmount, roomCode } = await req.json(); 
     if (!userId || !coinAmount) { 
       return NextResponse.json({ error: 'Missing fields' }, { status: 400 }); 
     } 
 
     const { data: success } = await supabase.rpc('deduct_coins_for_battle', { 
       p_user_id: userId, 
       p_amount: coinAmount 
     }); 
 
     if (!success) { 
       return NextResponse.json({ error: 'Insufficient coins. Please buy more Battle Coins.' }, { status: 400 }); 
     } 
 
     await supabase.from('coin_transactions').insert({ 
       user_id: userId, 
       type: 'battle_stake', 
       battle_coins_change: -coinAmount, 
       reward_coins_change: 0, 
       fee_coins: 0, 
       naira_equivalent: 0, 
       reference: `coin-stake-${roomCode}-${userId}-${Date.now()}`, 
       description: `Staked ${coinAmount} coins for room ${roomCode}` 
     }); 
 
     if (roomCode) { 
       await supabase 
         .from('battle_rooms') 
         .update({ use_coins: true, coin_stake: coinAmount }) 
         .eq('room_code', roomCode); 
     } 
 
     return NextResponse.json({ success: true }); 
   } catch (err) { 
     return NextResponse.json({ error: (err as Error).message }, { status: 500 }); 
   } 
 } 
