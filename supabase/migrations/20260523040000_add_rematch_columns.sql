-- Add rematch related columns to battle_rooms
ALTER TABLE battle_rooms ADD COLUMN IF NOT EXISTS rematch_requested_by UUID REFERENCES auth.users(id); 
ALTER TABLE battle_rooms ADD COLUMN IF NOT EXISTS rematch_accepted BOOLEAN DEFAULT false; 
ALTER TABLE battle_rooms ADD COLUMN IF NOT EXISTS rematch_room_code TEXT; 
