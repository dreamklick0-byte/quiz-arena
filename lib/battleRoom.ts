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

export async function findQuickMatch(
  userId: string,
  subject: string,
  stake: number,
  stakingEnabled: boolean
) {
  const supabase = getSupabaseClient();
  const effectiveStake = stakingEnabled ? stake : 0;

  // Clean up any old entries for this user
  await supabase.from("matchmaking_queue").delete().eq("user_id", userId);

  // Atomically find opponent or join queue
  const { data: matchResult, error: matchError } = await supabase.rpc("match_quick_battle", {
    p_user_id: userId,
    p_stake_amount: effectiveStake,
    p_subject: subject,
  });

  if (matchError) throw matchError;
  return matchResult;
}
