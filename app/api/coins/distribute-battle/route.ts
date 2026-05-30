import { NextResponse } from "next/server"; 
 import { createClient } from "@supabase/supabase-js"; 
 import { calcCoinPrizePool } from "@/lib/coinEconomy"; 
 
 export async function POST(req: Request) { 
   const supabase = createClient( 
     process.env.NEXT_PUBLIC_SUPABASE_URL!, 
     process.env.SUPABASE_SERVICE_ROLE_KEY! 
   ); 
   try { 
     const { roomCode } = await req.json(); 
 
     const { data: room } = await supabase 
       .from('battle_rooms') 
       .select('*') 
       .eq('room_code', roomCode) 
       .single(); 
 
     if (!room || room.is_paid || !room.use_coins) { 
       return NextResponse.json({ success: true, message: 'Already paid or not a coin battle' }); 
     } 
 
     const { data: players } = await supabase 
       .from('room_players') 
       .select('user_id, player_name, score') 
       .eq('room_id', room.id); 
 
     if (!players || players.length < 2) { 
       return NextResponse.json({ error: 'Not enough players' }, { status: 400 }); 
     } 
 
     const playersWithTime = players.map((p, idx) => ({ 
       ...p, 
       time_seconds: room[`player${idx + 1}_time_seconds`] || 120, 
       score: room[`player${idx + 1}_score`] || p.score || 0, 
     })); 
 
     playersWithTime.sort((a, b) => { 
       if (b.score !== a.score) return b.score - a.score; 
       return a.time_seconds - b.time_seconds; 
     }); 
 
     const coinStake = room.coin_stake || 0; 
     const { prizePool } = calcCoinPrizePool(coinStake, playersWithTime.length); 
     const winner = playersWithTime[0]; 
 
     if (prizePool > 0 && winner.user_id) { 
       await supabase.rpc('increment_reward_coins', { 
         p_user_id: winner.user_id, 
         p_amount: prizePool 
       }); 
 
       await supabase.from('coin_transactions').insert({ 
         user_id: winner.user_id, 
         type: 'battle_win', 
         battle_coins_change: 0, 
         reward_coins_change: prizePool, 
         fee_coins: 0, 
         naira_equivalent: 0, 
         reference: `battle-win-coins-${roomCode}-${Date.now()}`, 
         description: `Won ${prizePool} Reward Coins in room ${roomCode}` 
       }); 
     } 
 
     await supabase 
       .from('battle_rooms') 
       .update({ is_paid: true, prizes_paid: true, winner_id: winner.user_id }) 
       .eq('room_code', roomCode); 
 
     return NextResponse.json({ success: true, prizePool, winner: winner.player_name }); 
   } catch (err) { 
     return NextResponse.json({ error: (err as Error).message }, { status: 500 }); 
   } 
 } 
