-- Migration: Fix Maths subject naming and duplicate WAEC Maths to NECO
-- 1. Normalize subject name to 'maths' slug
UPDATE public.questions 
SET subject = 'maths' 
WHERE subject ILIKE 'Mathematics' OR subject ILIKE 'Maths';

-- 2. Duplicate WAEC Maths questions to NECO
-- Only for questions uploaded today (2026-05-20)
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
    NULL -- Set year to NULL for NECO sync
FROM public.questions
WHERE subject = 'maths' 
  AND exam_type = 'WAEC'
  AND created_at >= '2026-05-20 00:00:00'
  AND id NOT IN (
    -- Avoid duplicates if they already exist
    SELECT id FROM public.questions WHERE exam_type = 'NECO' AND subject = 'maths'
  );
