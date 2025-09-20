// OpenAI API Service - Direct API calls without Supabase Edge Functions

const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

if (!OPENAI_API_KEY) {
  console.error('VITE_OPENAI_API_KEY is not set in environment variables');
}

interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface OpenAIResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
  usage?: {
    total_tokens: number;
  };
}

async function callOpenAI(messages: OpenAIMessage[], maxTokens: number = 1000, temperature: number = 0.7): Promise<string> {
  if (!OPENAI_API_KEY) {
    throw new Error('OpenAI API key not configured');
  }

  const response = await fetch(OPENAI_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: messages,
      max_tokens: maxTokens,
      temperature: temperature,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`OpenAI API error: ${error.error?.message || 'Unknown error'}`);
  }

  const data: OpenAIResponse = await response.json();
  return data.choices[0].message.content;
}

function cleanJsonResponse(content: string): string {
  // Clean up markdown formatting if present
  if (content.includes('```json')) {
    content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '');
  }
  return content;
}

// Generate Aptitude Questions
export async function generateAptitudeQuestions(company: string, role: string) {
  const messages: OpenAIMessage[] = [
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
  ];

  const response = await callOpenAI(messages, 4000, 0.7);
  const cleanedResponse = cleanJsonResponse(response);
  return JSON.parse(cleanedResponse);
}

// Generate Coding Problems
export async function generateCodingProblems(company: string, role: string) {
  const messages: OpenAIMessage[] = [
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
  ];

  const response = await callOpenAI(messages, 3000, 0.7);
  const cleanedResponse = cleanJsonResponse(response);
  return JSON.parse(cleanedResponse);
}

// AI Interview Chat
export async function generateAIInterviewResponse(
  company: string, 
  role: string, 
  message: string, 
  conversationHistory: Array<{role: string, content: string}> = [],
  resumeData?: string,
  projects?: string[]
) {
  const systemPrompt = `You are conducting a technical and HR interview for a ${role} position at ${company}. 

Your role:
- Ask relevant technical questions based on the role and company
- Evaluate communication skills and confidence
- Ask behavioral questions about past experience and projects
- Provide follow-up questions based on responses
- Keep the interview professional but friendly
- Give a mix of technical and soft skill questions
- Reference their resume and projects when relevant

Interview Guidelines:
- Start with ice-breaker questions
- Ask about their experience and projects from their resume
- Test technical knowledge relevant to ${role} at ${company}
- Ask situational and behavioral questions
- Evaluate problem-solving approach
- Ask about specific technologies mentioned in their resume
- End with questions for the company

Be conversational, encouraging, and provide thoughtful follow-ups. Reference their background when asking questions.`;

  let contextMessage = message;
  
  if (resumeData || projects) {
    contextMessage += `\n\nContext about the candidate:
${resumeData ? `Resume Summary: ${resumeData}` : ''}
${projects && projects.length > 0 ? `Projects: ${projects.join(', ')}` : ''}

Use this information to ask personalized questions about their experience and projects.`;
  }

  const messages: OpenAIMessage[] = [
    { role: 'system', content: systemPrompt },
    ...conversationHistory.map(msg => ({ role: msg.role as 'user' | 'assistant', content: msg.content })),
    { role: 'user', content: contextMessage }
  ];

  return await callOpenAI(messages, 500, 0.8);
}

// Generate Final Feedback
export async function generateFinalFeedback(
  company: string, 
  role: string, 
  scores: { aptitude: number; coding: number; interview: number }
) {
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

  const messages: OpenAIMessage[] = [
    {
      role: 'system',
      content: 'You are an expert interview coach and HR professional. Provide detailed, constructive feedback that helps candidates improve their interview performance.'
    },
    {
      role: 'user',
      content: prompt
    }
  ];

  const response = await callOpenAI(messages, 1500, 0.7);
  const cleanedResponse = cleanJsonResponse(response);
  return JSON.parse(cleanedResponse);
}

// Evaluate Code Solution
export async function evaluateCodeSolution(
  problemTitle: string,
  problemDescription: string,
  testCases: Array<{ input: string; expected_output: string }>,
  userCode: string,
  language: string = 'python'
) {
  const messages: OpenAIMessage[] = [
    {
      role: 'system',
      content: `You are an expert code reviewer and evaluator. Your job is to analyze code solutions and determine if they are correct based on the problem requirements and test cases.

Evaluation Criteria:
1. Does the code solve the problem correctly?
2. Does it handle all the test cases properly?
3. Is the logic sound and efficient?
4. Are there any obvious bugs or errors?

Return your evaluation in this exact JSON format:
{
  "is_correct": true/false,
  "score": number (0-100),
  "feedback": "Detailed feedback about the solution",
  "test_results": [
    {
      "test_case": 1,
      "passed": true/false,
      "expected": "expected output",
      "actual": "what the code would produce",
      "explanation": "Why it passed/failed"
    }
  ],
  "suggestions": ["suggestion1", "suggestion2", ...]
}`
    },
    {
      role: 'user',
      content: `Problem: ${problemTitle}
Description: ${problemDescription}

Test Cases:
${testCases.map((tc, i) => `Test ${i + 1}: Input: ${tc.input} | Expected: ${tc.expected_output}`).join('\n')}

User's ${language} Code:
\`\`\`${language}
${userCode}
\`\`\`

Please evaluate this code solution and provide detailed feedback.`
    }
  ];

  const response = await callOpenAI(messages, 1000, 0.3);
  const cleanedResponse = cleanJsonResponse(response);
  return JSON.parse(cleanedResponse);
}
