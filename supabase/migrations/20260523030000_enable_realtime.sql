-- FIX: Enable Realtime for battle tables
ALTER PUBLICATION supabase_realtime ADD TABLE battle_rooms; 
ALTER PUBLICATION supabase_realtime ADD TABLE room_players;
