import { NextRequest, NextResponse } from "next/server"; 
import { getAdminClient } from "@/lib/supabase"; 

export async function POST(req: NextRequest) { 
  try { 
    const supabase = getAdminClient(); 
    const { userId, playerName, quickSubject, quickStake } = await req.json(); 

    if (!userId || !playerName || !quickSubject || quickStake === undefined) { 
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 }); 
    } 

    // Clean up old queue entries for this user 
    await supabase.from("matchmaking_queue").delete().eq("user_id", userId); 

    // Call the RPC to find or join queue 
    const { data: matchResult, error: matchError } = await supabase.rpc("match_quick_battle", { 
      p_user_id: userId, 
      p_stake_amount: quickStake, 
      p_subject: quickSubject, 
    }); 

    if (matchError) throw matchError; 

    if (matchResult.matched === true) { 
      // Generate room code 
      const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; 
      const roomCode = Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join(""); 

      // Create battle room 
      const { data: room, error: roomError } = await supabase 
        .from("battle_rooms") 
        .insert({ 
          room_code: roomCode, 
          max_players: 2, 
          subject: quickSubject, 
          host_id: userId, 
          status: "waiting", 
          stake_amount: quickStake, 
          prize_pool: quickStake ? Math.floor(quickStake * 1.6) : 0, 
        }) 
        .select("id, room_code") 
        .single(); 

      if (roomError) throw roomError; 

      // Insert host as room player 
      const { data: player, error: playerError } = await supabase 
        .from("room_players") 
        .insert({ room_id: room.id, player_name: playerName }) 
        .select("id") 
        .single(); 

      if (playerError) throw playerError; 

      // Update opponent's queue entry 
      await supabase 
        .from("matchmaking_queue") 
        .update({ status: "matched", room_id: room.id, room_code: roomCode }) 
        .eq("id", matchResult.opponent_queue_id); 

      // Update battle room with guest 
      await supabase 
        .from("battle_rooms") 
        .update({ guest_id: matchResult.opponent_id, started_at: new Date().toISOString() }) 
        .eq("id", room.id); 

      return NextResponse.json({ 
        matched: true, 
        roomCode: room.room_code, 
        roomId: room.id, 
        playerId: player.id, 
        opponentQueueId: matchResult.opponent_queue_id, 
      }); 
    } else { 
      // Not matched yet — return queue ID so client can poll 
      return NextResponse.json({ 
        matched: false, 
        queueId: matchResult.queue_id, 
      }); 
    } 
  } catch (err: any) { 
    console.error("quick-match error:", err); 
    return NextResponse.json({ error: err.message ?? "Matchmaking failed" }, { status: 500 }); 
  } 
} 

export async function GET(req: NextRequest) { 
  try { 
    const supabase = getAdminClient(); 
    const { searchParams } = new URL(req.url); 
    const queueId = searchParams.get("queueId"); 

    if (!queueId) return NextResponse.json({ error: "Missing queueId" }, { status: 400 }); 

    const { data, error } = await supabase 
      .from("matchmaking_queue") 
      .select("status, room_id, room_code") 
      .eq("id", queueId) 
      .maybeSingle(); 

    if (error) throw error; 

    return NextResponse.json(data ?? { status: "not_found" }); 
  } catch (err: any) { 
    return NextResponse.json({ error: err.message }, { status: 500 }); 
  } 
} 
