import { getSupabaseClient } from "@/lib/supabase";

export async function insertRoomPlayer(roomId: string, playerName: string) {
  const supabase = getSupabaseClient();
  const trimmed = playerName.trim();
  const basePayload = {
    room_id: roomId,
    player_name: trimmed,
    score: 0,
    finished: false,
  };

  const { data: sessionData } = await supabase.auth.getSession();
  const uid = sessionData.session?.user?.id;

  let player: { id: string } | null = null;

  if (uid) {
    const r1 = await supabase
      .from("room_players")
      .insert({ ...basePayload, user_id: uid })
      .select("id")
      .single();
    if (!r1.error && r1.data) {
      player = r1.data;
    }
  }

  if (!player) {
    const r2 = await supabase
      .from("room_players")
      .insert(basePayload)
      .select("id")
      .single();
    if (r2.error) throw r2.error;
    player = r2.data;
  }

  if (!player) throw new Error("Failed to join room.");
  return player;
}
