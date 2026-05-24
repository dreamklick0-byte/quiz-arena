import { getSupabaseClient } from "@/lib/supabase";
import { generateRoomCode } from "@/app/battle/battleUtils";
import { insertRoomPlayer } from "@/lib/battleRoomPlayer";

export type CreateBattleRoomResult = {
  roomCode: string;
  playerId: string;
  roomId: string;
};

export async function createBattleRoom(roomCode: string, subject: string, userId: string, stakeAmount?: number, maxPlayers?: number) { 
   const supabase = getSupabaseClient(); 
   
   const { data: room, error } = await supabase 
     .from("battle_rooms") 
     .insert({ 
       room_code: roomCode, max_players: maxPlayers ?? 2, 
       subject: subject, 
       host_id: userId, 
       status: "waiting", 
       stake_amount: stakeAmount ?? 0, 
       prize_pool: stakeAmount ? Math.floor(stakeAmount * 1.6) : 0, 
     }) 
     .select("id, room_code") 
     .single(); 
 
   if (error) throw error; 
   return room; 
 } 

export async function findQuickMatch(subject: string, userId: string, stakeAmount: number) { 
  const supabase = getSupabaseClient(); 

  const { data: rooms, error } = await supabase 
    .from("battle_rooms") 
    .select("id, room_code, subject, stake_amount, status, host_id, max_players") 
    .eq("status", "waiting") 
    .eq("subject", subject) 
    .eq("stake_amount", stakeAmount) 
    .eq("max_players", 2) 
    .neq("host_id", userId) 
    .order("created_at", { ascending: true }) 
    .limit(5); 

  if (error || !rooms || rooms.length === 0) return null; 

  for (const room of rooms) { 
    const { count } = await supabase 
      .from("room_players") 
      .select("*", { count: "exact", head: true }) 
      .eq("room_id", room.id); 

    if ((count ?? 0) < room.max_players) { 
      return room; 
    } 
  } 

  return null; 
} 


