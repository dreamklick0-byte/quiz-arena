import { NextResponse } from "next/server";
import { getSupabaseClient } from "@/lib/supabase";
import { processTransaction } from "@/lib/wallet";

export async function POST(req: Request) {
  try {
    const { roomCode } = await req.json();
    const supabase = getSupabaseClient();

    // 1. Get room details
    const { data: room, error: roomErr } = await supabase
      .from("battle_rooms")
      .select("*")
      .eq("room_code", roomCode)
      .single();

    if (roomErr) throw roomErr;
    if (room.is_paid) { 
      return NextResponse.json({ success: true, message: "Prizes already paid." }); 
    } 

    // 2. Get all players from room_players
    const { data: players, error: playersErr } = await supabase
      .from("room_players")
      .select("id, player_name, score, user_id")
      .eq("room_id", room.id);
    
    if (playersErr) throw playersErr;

    // Map each player to their correct score using host_id to determine player index 
    const playersWithTime = players.map((p) => { 
      const pIdx = room.host_id === p.user_id ? 1 : 2; 
      return { 
        ...p, 
        time_seconds: room[`player${pIdx}_time_seconds`] || 120, 
        score: room[`player${pIdx}_score`] || 0 
      }; 
    }); 

    // 3. Rank players: Score DESC, Time ASC
    playersWithTime.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.time_seconds - b.time_seconds;
    });

    const actualPlayers = playersWithTime.length;
    const playerPool = Number(room.prize_pool);
    
    interface BattleResult {
      id: string;
      player_name: string;
      score: number;
      user_id: string;
      time_seconds: number;
      prize: number;
      rank: number;
    }

    const results: BattleResult[] = [];
    const updates: Record<string, string | boolean | number | null> = { is_paid: true }; 

    if (actualPlayers >= 2) {
      // 1st Place
      const winner = playersWithTime[0];
      let prize1 = 0;
      if (actualPlayers === 2) prize1 = playerPool;
      else if (actualPlayers === 3) prize1 = playerPool * 0.60;
      else if (actualPlayers === 4) prize1 = playerPool * 0.50;

      if (prize1 > 0 && winner.user_id) {
        await processTransaction(
          winner.user_id,
          'win',
          prize1,
          `win-${roomCode}`,
          `Won Private Room - ${room.subject} ₦${room.stake_amount} stake`
        );
      }
      updates.winner_id = winner.user_id;
      results.push({ ...winner, prize: prize1, rank: 1 });
    }

    if (actualPlayers >= 3) {
      // 2nd Place
      const second = playersWithTime[1];
      let prize2 = 0;
      if (actualPlayers === 3) prize2 = playerPool * 0.40;
      else if (actualPlayers === 4) prize2 = playerPool * 0.30;

      if (prize2 > 0 && second.user_id) {
        await processTransaction(
          second.user_id,
          'win',
          prize2,
          `win2-${roomCode}`,
          `2nd Place Private Room - ${room.subject}`
        );
      }
      updates.second_place_id = second.user_id;
      results.push({ ...second, prize: prize2, rank: 2 });
    }

    if (actualPlayers === 4) {
      // 3rd Place
      const third = playersWithTime[2];
      const prize3 = playerPool * 0.20;

      if (prize3 > 0 && third.user_id) {
        await processTransaction(
          third.user_id,
          'win',
          prize3,
          `win3-${roomCode}`,
          `3rd Place Private Room - ${room.subject}`
        );
      }
      updates.third_place_id = third.user_id;
      results.push({ ...third, prize: prize3, rank: 3 });
    }

    // Update room
    const { error: updateErr } = await supabase
      .from("battle_rooms")
      .update(updates)
      .eq("id", room.id);

    if (updateErr) throw updateErr;

    return NextResponse.json({ success: true, results });
  } catch (err) {
    const error = err as Error;
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
