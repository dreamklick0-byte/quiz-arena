-- Rebuild Spin Wheel Schema
-- Add last_spin_at to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_spin_at TIMESTAMPTZ;

-- Create wheel_segments table
CREATE TABLE IF NOT EXISTS public.wheel_segments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  label TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('cash', 'xp', 'none')),
  amount INTEGER NOT NULL DEFAULT 0,
  weight INTEGER NOT NULL DEFAULT 1,
  color TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Initialize with default segments
INSERT INTO public.wheel_segments (label, type, amount, weight, color) VALUES
  ('₦50', 'cash', 50, 20, '#F5A623'),
  ('₦100', 'cash', 100, 15, '#7C3AED'),
  ('₦200', 'cash', 200, 10, '#06B6D4'),
  ('₦500', 'cash', 500, 5, '#10B981'),
  ('50 XP', 'xp', 50, 20, '#F59E0B'),
  ('100 XP', 'xp', 100, 15, '#8B5CF6'),
  ('Try again', 'none', 0, 10, '#374151'),
  ('₦1000', 'cash', 1000, 5, '#EF4444');

-- Create spin_attempts table for tracking
CREATE TABLE IF NOT EXISTS public.spin_attempts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  segment_index INTEGER NOT NULL,
  claimed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE public.wheel_segments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can view active segments" ON public.wheel_segments;
CREATE POLICY "Public can view active segments" ON public.wheel_segments FOR SELECT USING (is_active = true);

ALTER TABLE public.spin_attempts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own spin attempts" ON public.spin_attempts;
CREATE POLICY "Users can view own spin attempts" ON public.spin_attempts FOR SELECT USING (auth.uid() = user_id);
