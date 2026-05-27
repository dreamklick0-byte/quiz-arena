import { NextResponse } from "next/server"; 
import { createClient } from "@supabase/supabase-js"; 
import { processTransaction } from "@/lib/wallet"; 

export async function POST(req: Request) { 
  const supabase = createClient( 
    process.env.NEXT_PUBLIC_SUPABASE_URL!, 
    process.env.SUPABASE_SERVICE_ROLE_KEY! 
  ); 
  try { 
    const { roomCode } = await req.json(); 

    const { data: room, error: roomErr } = await supabase 
      .from("battle_rooms") 
      .select("*") 
      .eq("room_code", roomCode) 
      .single(); 

    if (roomErr) throw roomErr; 

    if (room.is_paid || room.prizes_paid) { 
      return NextResponse.json({ success: true, message: "Prizes already paid." }); 
    } 

    const { data: players, error: playersErr } = await supabase 
      .from("room_players") 
      .select("id, player_name, score, user_id") 
      .eq("room_id", room.id); 

    if (playersErr) throw playersErr; 

    const playersWithTime = (players || []).map((p, idx) => { 
      const pIdx = idx + 1; 
      return { 
        ...p, 
        time_seconds: room[`player${pIdx}_time_seconds`] || 120, 
        score: room[`player${pIdx}_score`] || p.score || 0, 
      }; 
    }); 

    playersWithTime.sort((a, b) => { 
      if (b.score !== a.score) return b.score - a.score; 
      return a.time_seconds - b.time_seconds; 
    }); 

    const actualPlayers = playersWithTime.length; 
    const playerPool = Number(room.prize_pool) || 0; 

    const results: { id: string; player_name: string; score: number; user_id: string; time_seconds: number; prize: number; rank: number }[] = []; 
    const updates: Record<string, string | boolean | number | null> = { 
      is_paid: true, 
      prizes_paid: true, 
    }; 

    if (actualPlayers >= 2) { 
      const winner = playersWithTime[0]; 
      let prize1 = 0; 
      if (actualPlayers === 2) prize1 = playerPool; 
      else if (actualPlayers === 3) prize1 = Math.floor(playerPool * 0.60); 
      else if (actualPlayers === 4) prize1 = Math.floor(playerPool * 0.50); 

      if (prize1 > 0 && winner.user_id) { 
        await processTransaction( 
          winner.user_id, 
          'win', 
          prize1, 
          `win-${roomCode}`, 
          `Won battle - ${room.subject} ₦${room.stake_amount} stake` 
        ); 
      } 
      updates.winner_id = winner.user_id; 
      results.push({ ...winner, prize: prize1, rank: 1 }); 
    } 

    if (actualPlayers >= 3) { 
      const second = playersWithTime[1]; 
      let prize2 = 0; 
      if (actualPlayers === 3) prize2 = Math.floor(playerPool * 0.40); 
      else if (actualPlayers === 4) prize2 = Math.floor(playerPool * 0.30); 

      if (prize2 > 0 && second.user_id) { 
        await processTransaction( 
          second.user_id, 
          'win', 
          prize2, 
          `win2-${roomCode}`, 
          `2nd Place battle - ${room.subject}` 
        ); 
      } 
      updates.second_place_id = second.user_id; 
      results.push({ ...second, prize: prize2, rank: 2 }); 
    } 

    if (actualPlayers === 4) { 
      const third = playersWithTime[2]; 
      const prize3 = Math.floor(playerPool * 0.20); 
      if (prize3 > 0 && third.user_id) { 
        await processTransaction( 
          third.user_id, 
          'win', 
          prize3, 
          `win3-${roomCode}`, 
          `3rd Place battle - ${room.subject}` 
        ); 
      } 
      updates.third_place_id = third.user_id; 
      results.push({ ...third, prize: prize3, rank: 3 }); 
    } 

    const { error: updateErr } = await supabase 
      .from("battle_rooms") 
      .update(updates) 
      .eq("id", room.id); 

    if (updateErr) throw updateErr; 

    return NextResponse.json({ success: true, results }); 
  } catch (err) { 
    const error = err as Error; 
    console.error("distribute-prizes error:", error); 
    return NextResponse.json({ success: false, error: error.message }, { status: 500 }); 
  } 
} 
