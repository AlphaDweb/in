import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { company, role } = await req.json();
    
    if (!company || !role) {
      throw new Error('Company and role are required');
    }

    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Generating aptitude questions for:', company, role);

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are an expert in creating company-specific aptitude questions. Generate exactly 25 multiple choice questions for ${company} ${role} position. Each question should test logical reasoning, quantitative aptitude, and verbal ability relevant to the role.`
          },
          {
            role: 'user',
            content: `Create 25 aptitude questions for a ${role} position at ${company}. Return them in this exact JSON format:
            {
              "questions": [
                {
                  "question": "Question text here",
                  "options": ["A) Option 1", "B) Option 2", "C) Option 3", "D) Option 4"],
                  "correct_answer": "A",
                  "explanation": "Brief explanation of the answer"
                }
              ]
            }`
          }
        ],
        max_tokens: 4000,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`OpenAI API error: ${error.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    let content = data.choices[0].message.content;
    
    // Clean up markdown formatting if present
    if (content.includes('```json')) {
      content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    }
    
    const questionsData = JSON.parse(content);

    console.log('Generated questions:', questionsData.questions.length);

    return new Response(JSON.stringify({
      success: true,
      questions: questionsData.questions,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error generating aptitude questions:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});