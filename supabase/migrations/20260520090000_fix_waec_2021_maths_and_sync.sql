-- Migration: Fix WAEC 2021 Maths naming and sync to NECO
-- This handles the 48 questions just uploaded with 'Mathematics' instead of 'maths'

-- 1. Normalize newly uploaded questions to 'maths' slug
UPDATE public.questions 
SET subject = 'maths' 
WHERE subject = 'Mathematics' AND year = 2021 AND exam_type = 'WAEC';

-- 2. Sync these WAEC 2021 Maths questions to NECO
-- (Duplicates them for NECO with year = NULL)
INSERT INTO public.questions (subject, exam_type, question, option_a, option_b, option_c, option_d, option_e, correct_answer, explanation, year)
SELECT 
    'maths', 
    'NECO', 
    question, 
    option_a, 
    option_b, 
    option_c, 
    option_d, 
    option_e, 
    correct_answer, 
    explanation, 
    NULL 
FROM public.questions
WHERE subject = 'maths' 
  AND exam_type = 'WAEC'
  AND year = 2021
  AND id NOT IN (
    -- Prevent duplicate syncs if run multiple times
    SELECT id FROM public.questions WHERE exam_type = 'NECO' AND subject = 'maths' AND year IS NULL
  );
