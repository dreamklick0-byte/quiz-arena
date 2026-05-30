import { NextResponse } from "next/server"; 
 import { createClient } from "@supabase/supabase-js"; 
 
 export async function GET(req: Request) { 
   const supabase = createClient( 
     process.env.NEXT_PUBLIC_SUPABASE_URL!, 
     process.env.SUPABASE_SERVICE_ROLE_KEY! 
   ); 
   try { 
     const { searchParams } = new URL(req.url); 
     const userId = searchParams.get('userId'); 
     if (!userId) return NextResponse.json({ error: 'Missing userId' }, { status: 400 }); 
 
     const { data } = await supabase 
       .from('arena_coin_wallets') 
       .select('battle_coins, reward_coins, total_purchased, total_won, total_withdrawn, total_fees_paid') 
       .eq('user_id', userId) 
       .maybeSingle(); 
 
     return NextResponse.json({ 
       battleCoins: data?.battle_coins ?? 0, 
       rewardCoins: data?.reward_coins ?? 0, 
       totalCoins: (data?.battle_coins ?? 0) + (data?.reward_coins ?? 0), 
       stats: data ?? {} 
     }); 
   } catch (err) { 
     return NextResponse.json({ error: (err as Error).message }, { status: 500 }); 
   } 
 } 
