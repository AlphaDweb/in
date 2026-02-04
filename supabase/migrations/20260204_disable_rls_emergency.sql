-- EMERGENCY DISABLE RLS for all tables to fix '42501' errors
-- Run this in Supabase SQL Editor

ALTER TABLE public.interviews DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_responses DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.interview_scores DISABLE ROW LEVEL SECURITY;

-- Grant all permissions to anonymous users (for demo purposes)
GRANT ALL ON public.interviews TO anon;
GRANT ALL ON public.questions TO anon;
GRANT ALL ON public.user_responses TO anon;
GRANT ALL ON public.interview_scores TO anon;

GRANT ALL ON public.interviews TO authenticated;
GRANT ALL ON public.questions TO authenticated;
GRANT ALL ON public.user_responses TO authenticated;
GRANT ALL ON public.interview_scores TO authenticated;

GRANT ALL ON public.interviews TO service_role;
GRANT ALL ON public.questions TO service_role;
GRANT ALL ON public.user_responses TO service_role;
GRANT ALL ON public.interview_scores TO service_role;
