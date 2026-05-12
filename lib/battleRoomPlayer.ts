import { getSupabaseClient } from "@/lib/supabase";

export async function insertRoomPlayer(roomId: string, playerName: string) { 
   const supabase = getSupabaseClient(); 
   const trimmed = playerName.trim(); 
   
   const { data: sessionData } = await supabase.auth.getSession(); 
   const uid = sessionData.session?.user?.id ?? null; 
 
   const { data: player, error } = await supabase 
     .from("room_players") 
     .insert({ 
       room_id: roomId, 
       player_name: trimmed, 
       score: 0, 
       finished: false, 
       user_id: uid, 
     }) 
     .select("id") 
     .single(); 
 
   if (error) throw error; 
   if (!player) throw new Error("Failed to join room."); 
   return player; 
 } 
