-- Create interviews table to track overall interview sessions
CREATE TABLE public.interviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  company VARCHAR(255) NOT NULL,
  role VARCHAR(255) NOT NULL,
  status VARCHAR(50) DEFAULT 'in_progress',
  current_round VARCHAR(50) DEFAULT 'aptitude',
  total_score INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create questions table to store generated questions
CREATE TABLE public.questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  interview_id UUID NOT NULL REFERENCES public.interviews(id) ON DELETE CASCADE,
  round_type VARCHAR(50) NOT NULL,
  question_text TEXT NOT NULL,
  question_data JSONB, -- For storing additional data like options, test cases, etc.
  correct_answer TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user responses table
CREATE TABLE public.user_responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  interview_id UUID NOT NULL REFERENCES public.interviews(id) ON DELETE CASCADE,
  user_answer TEXT,
  is_correct BOOLEAN,
  score INTEGER DEFAULT 0,
  time_taken INTEGER, -- in seconds
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create interview scores table for final results
CREATE TABLE public.interview_scores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  interview_id UUID NOT NULL REFERENCES public.interviews(id) ON DELETE CASCADE,
  round_type VARCHAR(50) NOT NULL,
  score INTEGER NOT NULL,
  max_score INTEGER NOT NULL,
  feedback TEXT,
  completed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.interviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interview_scores ENABLE ROW LEVEL SECURITY;

-- Create policies for interviews
CREATE POLICY "Users can view their own interviews" 
ON public.interviews 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own interviews" 
ON public.interviews 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own interviews" 
ON public.interviews 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create policies for questions
CREATE POLICY "Users can view questions for their interviews" 
ON public.questions 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.interviews 
  WHERE interviews.id = questions.interview_id 
  AND interviews.user_id = auth.uid()
));

CREATE POLICY "System can create questions" 
ON public.questions 
FOR INSERT 
WITH CHECK (true);

-- Create policies for user responses
CREATE POLICY "Users can view their own responses" 
ON public.user_responses 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.interviews 
  WHERE interviews.id = user_responses.interview_id 
  AND interviews.user_id = auth.uid()
));

CREATE POLICY "Users can create their own responses" 
ON public.user_responses 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM public.interviews 
  WHERE interviews.id = user_responses.interview_id 
  AND interviews.user_id = auth.uid()
));

-- Create policies for interview scores
CREATE POLICY "Users can view their own scores" 
ON public.interview_scores 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.interviews 
  WHERE interviews.id = interview_scores.interview_id 
  AND interviews.user_id = auth.uid()
));

CREATE POLICY "System can create scores" 
ON public.interview_scores 
FOR INSERT 
WITH CHECK (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_interviews_updated_at
BEFORE UPDATE ON public.interviews
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();