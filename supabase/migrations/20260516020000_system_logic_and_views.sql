-- Comprehensive System Setup Migration
-- This migration adds missing tables, functions, and views required for the admin and battle systems.

-- 1. Admin Accounts Table
CREATE TABLE IF NOT EXISTS public.admin_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('super_admin', 'admin')),
    full_name TEXT,
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Platform Settings Table
CREATE TABLE IF NOT EXISTS public.platform_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. User Presence Table
CREATE TABLE IF NOT EXISTS public.user_presence (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    last_seen TIMESTAMPTZ DEFAULT now()
);

-- 4. Arena Coins Table
CREATE TABLE IF NOT EXISTS public.arena_coins (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    coins INTEGER DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5. User XP Table
CREATE TABLE IF NOT EXISTS public.user_xp (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    xp INTEGER DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 6. User Notifications Table
CREATE TABLE IF NOT EXISTS public.user_notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 7. Referrals Table
CREATE TABLE IF NOT EXISTS public.referrals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    referrer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    referred_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(referred_id)
);

-- 8. Practice Sessions Table
CREATE TABLE IF NOT EXISTS public.practice_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    subject TEXT NOT NULL,
    score INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 9. Matchmaking Queue Table
CREATE TABLE IF NOT EXISTS public.matchmaking_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    subject TEXT, -- Nullable for league matches
    stake_amount NUMERIC NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'searching' CHECK (status IN ('searching', 'matched', 'cancelled')),
    room_id UUID, -- References battle_rooms(id)
    room_code TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 9.1 Battle Answers Table
CREATE TABLE IF NOT EXISTS public.battle_answers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_code TEXT NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    question_index INTEGER NOT NULL,
    is_correct BOOLEAN NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 10. Admin Users View
-- This view simplifies fetching user data across multiple tables
CREATE OR REPLACE VIEW public.admin_users_view AS
SELECT 
    u.id,
    u.email,
    u.last_sign_in_at,
    u.created_at,
    p.display_name,
    p.referral_code,
    p.status,
    p.referred_by,
    COALESCE(w.balance, 0) as wallet_balance,
    COALESCE(c.coins, 0) as coins,
    COALESCE(x.xp, 0) as xp,
    COALESCE(pr.last_seen, u.last_sign_in_at) as last_seen
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
LEFT JOIN public.wallets w ON u.id = w.user_id
LEFT JOIN public.arena_coins c ON u.id = c.user_id
LEFT JOIN public.user_xp x ON u.id = x.user_id
LEFT JOIN public.user_presence pr ON u.id = pr.user_id;

-- 11. Function: get_platform_stats
CREATE OR REPLACE FUNCTION public.get_platform_stats()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    total_revenue NUMERIC;
    total_payouts NUMERIC;
BEGIN
    -- Sum revenue from leagues and platform cuts
    SELECT COALESCE(SUM(platform_revenue), 0) INTO total_revenue FROM public.leagues;
    
    -- Sum processed withdrawals
    SELECT COALESCE(SUM(amount), 0) INTO total_payouts FROM public.withdrawal_requests WHERE status = 'processed';

    RETURN jsonb_build_object(
        'total_revenue', total_revenue,
        'total_payouts', total_payouts
    );
END;
$$;

-- 12. Function: increment_wallet_balance
CREATE OR REPLACE FUNCTION public.increment_wallet_balance(p_user_id UUID, p_amount NUMERIC)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO public.wallets (user_id, balance)
    VALUES (p_user_id, p_amount)
    ON CONFLICT (user_id) DO UPDATE
    SET balance = public.wallets.balance + p_amount,
        updated_at = now();
END;
$$;

-- 13. Function: match_quick_battle
CREATE OR REPLACE FUNCTION public.match_quick_battle(
    p_user_id UUID,
    p_stake_amount NUMERIC,
    p_subject TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    opponent RECORD;
    new_queue_id UUID;
BEGIN
    -- Try to find an opponent
    SELECT * INTO opponent
    FROM public.matchmaking_queue
    WHERE status = 'searching'
      AND stake_amount = p_stake_amount
      AND subject = p_subject
      AND user_id != p_user_id
    ORDER BY created_at ASC
    LIMIT 1
    FOR UPDATE SKIP LOCKED;

    IF opponent.id IS NOT NULL THEN
        -- Match found
        RETURN jsonb_build_object(
            'matched', true,
            'opponent_id', opponent.user_id,
            'opponent_queue_id', opponent.id
        );
    ELSE
        -- No opponent, join queue
        INSERT INTO public.matchmaking_queue (user_id, subject, stake_amount, status)
        VALUES (p_user_id, p_subject, p_stake_amount, 'searching')
        RETURNING id INTO new_queue_id;

        RETURN jsonb_build_object(
            'matched', false,
            'queue_id', new_queue_id
        );
    END IF;
END;
$$;

-- Enable RLS and Grant Permissions
ALTER TABLE public.admin_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_presence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.arena_coins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_xp ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.practice_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matchmaking_queue ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.battle_answers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can insert own battle answers" ON public.battle_answers FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view own battle answers" ON public.battle_answers FOR SELECT USING (auth.uid() = user_id);

-- Basic policies (Restricted mostly to service_role or authenticated with logic)
CREATE POLICY "Service role can manage everything" ON public.admin_accounts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public can view platform settings" ON public.platform_settings FOR SELECT USING (true);
CREATE POLICY "Service role can manage platform settings" ON public.platform_settings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Users can manage own presence" ON public.user_presence FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view own coins" ON public.arena_coins FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can view own xp" ON public.user_xp FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can view own notifications" ON public.user_notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own notifications" ON public.user_notifications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can view own referrals" ON public.referrals FOR SELECT USING (auth.uid() = referrer_id OR auth.uid() = referred_id);
CREATE POLICY "Users can manage own practice sessions" ON public.practice_sessions FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can manage own matchmaking" ON public.matchmaking_queue FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_platform_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_wallet_balance(UUID, NUMERIC) TO authenticated;
GRANT EXECUTE ON FUNCTION public.match_quick_battle(UUID, NUMERIC, TEXT) TO authenticated;
