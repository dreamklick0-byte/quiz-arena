-- FIX 2: battle_answers table is missing created_at column. 
ALTER TABLE battle_answers ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now(); 

-- FIX 3: Force-finish any stuck active rooms: 
UPDATE battle_rooms 
SET status = 'finished', ends_at = now() 
WHERE status = 'active' 
AND player1_finished = true 
AND (player2_finished = false OR player2_score IS NULL) 
AND started_at < now() - interval '10 minutes'; 
