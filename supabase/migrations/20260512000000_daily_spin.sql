-- Create daily_spins table
CREATE TABLE IF NOT EXISTS daily_spins (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  prize_label TEXT NOT NULL,
  prize_amount NUMERIC DEFAULT 0,
  prize_type TEXT NOT NULL,
  spun_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS daily_spins_user_id_idx ON daily_spins(user_id);
CREATE INDEX IF NOT EXISTS daily_spins_spun_at_idx ON daily_spins(spun_at);
