CREATE TABLE IF NOT EXISTS user_ranks ( 
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY, 
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE, 
  current_rank TEXT DEFAULT 'Rookie Mind', 
  rank_tier TEXT DEFAULT 'beginner', 
  total_xp INTEGER DEFAULT 0, 
  weekly_xp INTEGER DEFAULT 0, 
  monthly_xp INTEGER DEFAULT 0, 
  battle_wins INTEGER DEFAULT 0, 
  battle_losses INTEGER DEFAULT 0, 
  current_streak INTEGER DEFAULT 0, 
  longest_streak INTEGER DEFAULT 0, 
  last_active DATE DEFAULT CURRENT_DATE, 
  secret_titles TEXT[] DEFAULT '{}', 
  created_at TIMESTAMPTZ DEFAULT now(), 
  updated_at TIMESTAMPTZ DEFAULT now() 
); 

CREATE TABLE IF NOT EXISTS xp_transactions ( 
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY, 
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE, 
  amount INTEGER NOT NULL, 
  source TEXT NOT NULL, 
  description TEXT, 
  created_at TIMESTAMPTZ DEFAULT now() 
); 

CREATE TABLE IF NOT EXISTS user_achievements ( 
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY, 
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE, 
  achievement_key TEXT NOT NULL, 
  unlocked_at TIMESTAMPTZ DEFAULT now(), 
  UNIQUE(user_id, achievement_key) 
); 

ALTER TABLE user_ranks ENABLE ROW LEVEL SECURITY; 
ALTER TABLE xp_transactions ENABLE ROW LEVEL SECURITY; 
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY; 

CREATE POLICY "Users can view own rank" ON user_ranks 
FOR SELECT USING (auth.uid() = user_id); 
CREATE POLICY "Users can insert own rank" ON user_ranks 
FOR INSERT WITH CHECK (auth.uid() = user_id); 
CREATE POLICY "Users can update own rank" ON user_ranks 
FOR UPDATE USING (auth.uid() = user_id); 
CREATE POLICY "Anyone can view ranks for leaderboard" ON user_ranks 
FOR SELECT USING (true); 

CREATE POLICY "Users can view own xp transactions" ON xp_transactions 
FOR SELECT USING (auth.uid() = user_id); 
CREATE POLICY "Users can insert own xp transactions" ON xp_transactions 
FOR INSERT WITH CHECK (auth.uid() = user_id); 

CREATE POLICY "Users can view own achievements" ON user_achievements 
FOR SELECT USING (auth.uid() = user_id); 
CREATE POLICY "Users can insert own achievements" ON user_achievements 
FOR INSERT WITH CHECK (auth.uid() = user_id); 

GRANT ALL ON user_ranks TO authenticated; 
GRANT ALL ON user_ranks TO service_role; 
GRANT ALL ON xp_transactions TO authenticated; 
GRANT ALL ON xp_transactions TO service_role; 
GRANT ALL ON user_achievements TO authenticated; 
GRANT ALL ON user_achievements TO service_role; 

CREATE OR REPLACE FUNCTION get_rank_from_xp(p_xp INTEGER) 
RETURNS TEXT AS $$ 
BEGIN 
  IF p_xp >= 10000000 THEN RETURN 'Grand Quiz Emperor'; 
  ELSIF p_xp >= 5000000 THEN RETURN 'Arena Immortal'; 
  ELSIF p_xp >= 2000000 THEN RETURN 'Supreme Champion'; 
  ELSIF p_xp >= 1000000 THEN RETURN 'Legend Scholar'; 
  ELSIF p_xp >= 700000 THEN RETURN 'Master Strategist'; 
  ELSIF p_xp >= 350000 THEN RETURN 'Academic Titan'; 
  ELSIF p_xp >= 250000 THEN RETURN 'IQ Dominator'; 
  ELSIF p_xp >= 150000 THEN RETURN 'Trivia Phantom'; 
  ELSIF p_xp >= 100000 THEN RETURN 'Genius Vanguard'; 
  ELSIF p_xp >= 60000 THEN RETURN 'Mind Gladiator'; 
  ELSIF p_xp >= 40000 THEN RETURN 'Quiz Commander'; 
  ELSIF p_xp >= 30000 THEN RETURN 'Brainstorm Knight'; 
  ELSIF p_xp >= 25000 THEN RETURN 'Elite Thinker'; 
  ELSIF p_xp >= 20000 THEN RETURN 'Wisdom Raider'; 
  ELSIF p_xp >= 12000 THEN RETURN 'Arena Challenger'; 
  ELSIF p_xp >= 8000 THEN RETURN 'Battle Scholar'; 
  ELSIF p_xp >= 5000 THEN RETURN 'Knowledge Hunter'; 
  ELSIF p_xp >= 3000 THEN RETURN 'Quiz Scout'; 
  ELSIF p_xp >= 1000 THEN RETURN 'Brain Starter'; 
  ELSE RETURN 'Rookie Mind'; 
  END IF; 
END; 
$$ LANGUAGE plpgsql; 

CREATE OR REPLACE FUNCTION get_rank_tier(p_rank TEXT) 
RETURNS TEXT AS $$ 
BEGIN 
  IF p_rank IN ('Rookie Mind','Brain Starter','Quiz Scout','Knowledge Hunter') 
    THEN RETURN 'beginner'; 
  ELSIF p_rank IN ('Battle Scholar','Arena Challenger','Wisdom Raider','Elite Thinker') 
    THEN RETURN 'intermediate'; 
  ELSIF p_rank IN ('Brainstorm Knight','Quiz Commander','Mind Gladiator','Genius Vanguard') 
    THEN RETURN 'advanced'; 
  ELSIF p_rank IN ('Trivia Phantom','IQ Dominator','Academic Titan','Master Strategist') 
    THEN RETURN 'elite'; 
  ELSE RETURN 'legendary'; 
  END IF; 
END; 
$$ LANGUAGE plpgsql; 

CREATE OR REPLACE FUNCTION award_xp( 
  p_user_id UUID, 
  p_amount INTEGER, 
  p_source TEXT, 
  p_description TEXT DEFAULT NULL 
) 
RETURNS json AS $$ 
DECLARE 
  v_old_xp INTEGER; 
  v_new_xp INTEGER; 
  v_old_rank TEXT; 
  v_new_rank TEXT; 
  v_ranked_up BOOLEAN := false; 
BEGIN 
  INSERT INTO user_ranks (user_id, total_xp, weekly_xp, monthly_xp) 
  VALUES (p_user_id, 0, 0, 0) 
  ON CONFLICT (user_id) DO NOTHING; 

  SELECT total_xp, current_rank INTO v_old_xp, v_old_rank 
  FROM user_ranks WHERE user_id = p_user_id; 

  v_new_xp := v_old_xp + p_amount; 
  v_new_rank := get_rank_from_xp(v_new_xp); 

  UPDATE user_ranks SET 
    total_xp = v_new_xp, 
    weekly_xp = weekly_xp + p_amount, 
    monthly_xp = monthly_xp + p_amount, 
    current_rank = v_new_rank, 
    rank_tier = get_rank_tier(v_new_rank), 
    updated_at = now() 
  WHERE user_id = p_user_id; 

  INSERT INTO xp_transactions (user_id, amount, source, description) 
  VALUES (p_user_id, p_amount, p_source, p_description); 

  IF v_new_rank != v_old_rank THEN 
    v_ranked_up := true; 
  END IF; 

  RETURN json_build_object( 
    'old_xp', v_old_xp, 
    'new_xp', v_new_xp, 
    'old_rank', v_old_rank, 
    'new_rank', v_new_rank, 
    'ranked_up', v_ranked_up, 
    'xp_gained', p_amount 
  ); 
END; 
$$ LANGUAGE plpgsql SECURITY DEFINER; 
