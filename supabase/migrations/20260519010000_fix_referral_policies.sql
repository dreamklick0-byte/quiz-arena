-- Migration to fix RLS policies and column naming for referrals table
-- Based on interpretation of the Supabase Dashboard image

-- 1. Rename column referred_id to referee_id for consistency with the application code
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='referrals' AND column_name='referred_id') THEN
    ALTER TABLE public.referrals RENAME COLUMN referred_id TO referee_id;
  END IF;
END $$;

-- 2. Drop redundant and insecure policies identified in the image
DROP POLICY IF EXISTS "Users see own referrals" ON public.referrals;
DROP POLICY IF EXISTS "Users can view own referrals" ON public.referrals;
DROP POLICY IF EXISTS "System updates referrals" ON public.referrals;
DROP POLICY IF EXISTS "System inserts referrals" ON public.referrals;

-- 3. Create a single, secure SELECT policy
-- This allows both the referrer (who invited) and the referee (who was invited) to see the record.
CREATE POLICY "Users can view own referrals" ON public.referrals 
FOR SELECT USING (auth.uid() = referrer_id OR auth.uid() = referee_id);

-- 4. Secure INSERT and UPDATE policies
-- These are typically handled by the service role in API routes.
-- If no public access is needed, we don't define policies for them, which defaults to 'deny all'.
-- This fixes the 'System updates referrals = true' security hole.
