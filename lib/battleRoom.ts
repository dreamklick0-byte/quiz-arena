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
