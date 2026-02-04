-- Migration: Fix RLS for public access (or when auth is not used)
-- Date: 2026-02-04

-- 1. Interviews table
DROP POLICY IF EXISTS "Users can view their own interviews" ON public.interviews;
CREATE POLICY "Anyone can view interviews" ON public.interviews FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can create their own interviews" ON public.interviews;
CREATE POLICY "Anyone can create interviews" ON public.interviews FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update their own interviews" ON public.interviews;
CREATE POLICY "Anyone can update interviews" ON public.interviews FOR UPDATE USING (true);

-- 2. Questions table
DROP POLICY IF EXISTS "Users can view questions for their interviews" ON public.questions;
CREATE POLICY "Anyone can view questions" ON public.questions FOR SELECT USING (true);

-- 3. User Responses table
DROP POLICY IF EXISTS "Users can view their own responses" ON public.user_responses;
CREATE POLICY "Anyone can view responses" ON public.user_responses FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can create their own responses" ON public.user_responses;
CREATE POLICY "Anyone can create responses" ON public.user_responses FOR INSERT WITH CHECK (true);

-- 4. Interview Scores table
DROP POLICY IF EXISTS "Users can view their own scores" ON public.interview_scores;
CREATE POLICY "Anyone can view scores" ON public.interview_scores FOR SELECT USING (true);

DROP POLICY IF EXISTS "System can create scores" ON public.interview_scores;
CREATE POLICY "Anyone can create scores" ON public.interview_scores FOR INSERT WITH CHECK (true);
