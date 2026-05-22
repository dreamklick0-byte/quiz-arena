-- Migration: Normalize Subject Names to Slugs
-- This fixes the issue where questions are not appearing in practice mode or admin filters
-- due to subject name mismatches (e.g., 'english' vs 'english').

-- Update 'english' to 'english'
UPDATE public.questions 
SET subject = 'english' 
WHERE subject = 'english' OR subject = 'English' OR subject = 'english';

-- Update 'Mathematics' to 'maths'
UPDATE public.questions 
SET subject = 'maths' 
WHERE subject = 'Mathematics' OR subject = 'Maths' OR subject = 'mathematics';

-- Update 'Physics' to 'physics'
UPDATE public.questions 
SET subject = 'physics' 
WHERE subject = 'Physics';

-- Update 'Chemistry' to 'chemistry'
UPDATE public.questions 
SET subject = 'chemistry' 
WHERE subject = 'Chemistry';

-- Update 'Biology' to 'biology'
UPDATE public.questions 
SET subject = 'biology' 
WHERE subject = 'Biology';

-- Update 'Government' to 'government'
UPDATE public.questions 
SET subject = 'government' 
WHERE subject = 'Government';

-- Update 'Economics' to 'economics'
UPDATE public.questions 
SET subject = 'economics' 
WHERE subject = 'Economics';

-- Update 'Agricultural Science' to 'agricultural_science'
UPDATE public.questions 
SET subject = 'agricultural_science' 
WHERE subject = 'Agricultural Science' OR subject = 'Agri Sci' OR subject = 'Agric Science';

-- Update 'Current Affairs' to 'current_affairs'
UPDATE public.questions 
SET subject = 'current_affairs' 
WHERE subject = 'Current Affairs' OR subject = 'CurrentAffairs';
