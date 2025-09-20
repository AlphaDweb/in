import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { company, role, scores, sessionId } = await req.json();
    
    if (!company || !role || !scores) {
      throw new Error('Company, role, and scores are required');
    }

    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    console.log('Generating final feedback for:', company, role, scores);

    const totalScore = Math.round((scores.aptitude + scores.coding + scores.interview) / 3);

    const prompt = `As an expert interview coach and HR professional, analyze this candidate's performance in a ${role} position interview at ${company}.

Interview Results:
- Aptitude Round: ${scores.aptitude}% (Logical reasoning, quantitative aptitude)
- Coding Round: ${scores.coding}% (Programming challenges, problem-solving)
- AI Interview Round: ${scores.interview}% (Communication, technical discussion)
- Overall Score: ${totalScore}%

Please provide a comprehensive analysis in the following JSON format:
{
  "overall_score": ${totalScore},
  "performance_analysis": "2-3 sentences analyzing overall performance and readiness for ${company}",
  "strengths": ["3-4 specific strengths based on the scores"],
  "areas_for_improvement": ["3-4 specific areas to work on"],
  "company_specific_feedback": "Paragraph about readiness for ${company} specifically and how they compare to typical candidates",
  "next_steps": ["4-5 specific, actionable recommendations for improvement"],
  "confidence_rating": (number from 1-10 representing interview readiness)
}

Make the feedback personalized, constructive, and actionable. Consider ${company}'s known interview style and requirements for ${role} positions.`;

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
            content: 'You are an expert interview coach and HR professional. Provide detailed, constructive feedback that helps candidates improve their interview performance.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 1500,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`OpenAI API error: ${error.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    let feedbackData;
    
    try {
      feedbackData = JSON.parse(data.choices[0].message.content);
    } catch (parseError) {
      console.error('Error parsing JSON response:', parseError);
      // Fallback response
      feedbackData = {
        overall_score: totalScore,
        performance_analysis: `You completed the ${company} ${role} interview simulation with a ${totalScore}% overall score. This demonstrates your capabilities across technical and communication skills.`,
        strengths: [
          "Successfully completed all interview rounds",
          "Demonstrated problem-solving abilities", 
          "Showed communication skills during the interview",
          "Maintained composure under time pressure"
        ],
        areas_for_improvement: [
          "Continue practicing coding problems",
          "Work on technical communication",
          "Review company-specific interview patterns",
          "Strengthen weak areas identified in assessment"
        ],
        company_specific_feedback: `Your performance indicates readiness for the ${company} interview process. Focus on areas where you scored lower to increase your chances of success.`,
        next_steps: [
          "Practice more problems similar to those asked by " + company,
          "Review technical concepts related to " + role,
          "Practice explaining your thought process clearly",
          "Research " + company + " culture and values",
          "Schedule mock interviews with peers or mentors"
        ],
        confidence_rating: Math.min(10, Math.max(1, Math.round(totalScore / 10)))
      };
    }

    console.log('Generated feedback successfully');

    return new Response(JSON.stringify({
      success: true,
      feedback: feedbackData,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error generating final feedback:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});