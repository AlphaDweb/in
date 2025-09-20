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

    console.log('Generating coding problems for:', company, role);

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
            content: `You are an expert in creating company-specific coding problems. Generate exactly 3 coding problems that ${company} typically asks for ${role} positions. Problems should be medium difficulty and include test cases.`
          },
          {
            role: 'user',
            content: `Create 3 coding problems for a ${role} position at ${company}. Return them in this exact JSON format:
            {
              "problems": [
                {
                  "title": "Problem title",
                  "description": "Detailed problem description with constraints",
                  "example_input": "Sample input",
                  "example_output": "Expected output",
                  "test_cases": [
                    {"input": "test input 1", "expected_output": "expected output 1"},
                    {"input": "test input 2", "expected_output": "expected output 2"}
                  ],
                  "difficulty": "Medium",
                  "tags": ["array", "string"]
                }
              ]
            }`
          }
        ],
        max_tokens: 3000,
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
    
    const problemsData = JSON.parse(content);

    console.log('Generated problems:', problemsData.problems.length);

    return new Response(JSON.stringify({
      success: true,
      problems: problemsData.problems,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error generating coding problems:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});