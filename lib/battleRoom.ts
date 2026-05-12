import { getSupabaseClient } from "@/lib/supabase";
import { generateRoomCode } from "@/app/battle/battleUtils";
import { insertRoomPlayer } from "@/lib/battleRoomPlayer";

export type CreateBattleRoomResult = {
  roomCode: string;
  playerId: string;
  roomId: string;
};

/**
 * Creates a waiting room and first player row (battle host).
 */
export async function createBattleRoom(
  subject: string,
  playerName: string,
  stakeAmount: number = 0,
  maxPlayers: number = 2
): Promise<CreateBattleRoomResult> {
  const supabase = getSupabaseClient();
  const roomCode = generateRoomCode(6);

  const { data: { user } } = await supabase.auth.getUser();
  const currentUserId = user?.id || null;

  const prizePool = stakeAmount * maxPlayers;
  const platformCut = prizePool * 0.20;
  const netPrizePool = prizePool - platformCut;

  const { data: room, error: roomErr } = await supabase
    .from("battle_rooms")
    .insert({
      room_code: roomCode,
      status: "waiting",
      subject,
      current_question: 0,
      stake_amount: stakeAmount,
      prize_pool: netPrizePool,
      max_players: maxPlayers,
      is_paid: stakeAmount > 0,
      host_id: currentUserId
    })
    .select("id, room_code")
    .single();

  if (roomErr) throw roomErr;

  const player = await insertRoomPlayer(room.id, playerName);

  return {
    roomCode: room.room_code,
    playerId: player.id,
    roomId: room.id,
  };
}
