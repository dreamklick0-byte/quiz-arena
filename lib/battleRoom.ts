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
): Promise<CreateBattleRoomResult> {
  const supabase = getSupabaseClient();
  const roomCode = generateRoomCode(6);

  const { data: room, error: roomErr } = await supabase
    .from("battle_rooms")
    .insert({
      room_code: roomCode,
      status: "waiting",
      subject,
      current_question: 0,
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
