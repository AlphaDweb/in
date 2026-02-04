// AI Service - Powered by Google Gemini (via Serverless Proxy)

// Interfaces
interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ResumeAnalysisResult {
  summary: string;
  years_of_experience: number | null;
  skills: string[];
  roles: string[];
  companies: string[];
  education: string[];
  projects: Array<{ title: string; technologies: string[]; description?: string }>;
}

/**
 * Core function to call the Gemini API via our backend proxy.
 * Fallback to direct call for local development (npm run dev).
 */
async function callGemini(messages: Message[], maxTokens: number = 1000, temperature: number = 0.7): Promise<string> {
  // 1. Try the serverless API proxy (Skip for local dev to avoid console clutter)
  if (!window.location.hostname.includes('localhost')) {
    try {
      const response = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages, maxTokens, temperature }),
      });

      if (response.ok) {
        const data = await response.json();
        return data.text;
      }

      if (response.status !== 404) {
        const error = await response.json();
        throw new Error(error.error || 'Gemini Proxy Error');
      }
    } catch (err: any) {
      if (err instanceof Error && !err.message.includes('404') && !err.message.includes('Unexpected token')) {
        throw err;
      }
    }
  }


  // 2. Fallback for Local Development (npm run dev)
  // Vite dev server doesn't host /api routes, so we go direct.
  const localApiKey = import.meta.env.VITE_GEMINI_API_KEY1 || import.meta.env.VITE_GEMINI_API_KEY;
  let localApiUrl = import.meta.env.VITE_GEMINI_API_URL || 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash';

  if (!localApiKey) {
    throw new Error('Gemini Proxy not found (404) and no local key configured.');
  }

  // Ensure URL is correct
  if (!localApiUrl.includes(':generateContent')) {
    localApiUrl = localApiUrl.includes('?')
      ? localApiUrl.replace('?', ':generateContent?')
      : `${localApiUrl}:generateContent`;
  }

  // Convert Message to Gemini format
  const geminiMessages = messages.map(msg => ({
    role: msg.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: msg.content }]
  }));

  const response = await fetch(`${localApiUrl}?key=${localApiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: geminiMessages,
      generationConfig: { maxOutputTokens: maxTokens, temperature: temperature }
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Gemini Direct API Error');
  }

  const data = await response.json();
  return data.candidates[0].content.parts[0].text;
}

/**
 * Universal AI call function
 */
async function callAI(messages: Message[], maxTokens: number = 1000, temperature: number = 0.7): Promise<string> {
  return await callGemini(messages, maxTokens, temperature);
}

/**
 * Utility to clean AI JSON responses and extract only the JSON part
 */
function cleanJsonResponse(content: string): string {
  // 1. Remove markdown code blocks if present
  let cleaned = content;
  if (cleaned.includes('```json')) {
    cleaned = cleaned.replace(/```json\n?/g, '').replace(/```\n?/g, '');
  } else if (cleaned.includes('```')) {
    cleaned = cleaned.replace(/```\n?/g, '');
  }

  // 2. Find the first '{' and last '}' to extract the JSON object
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');

  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.substring(firstBrace, lastBrace + 1);
  }

  return cleaned.trim();
}

// --- Specific AI Functions ---

/**
 * Generate aptitude questions for a specific role and company
 */
export async function generateAptitudeQuestions(company: string, role: string) {
  const messages: Message[] = [
    {
      role: 'system',
      content: `You are an expert recruiter. Generate exactly 10 multiple choice questions for a ${role} position at ${company}. Focus on logical reasoning, quantitative aptitude, and verbal ability.`
    },
    {
      role: 'user',
      content: `Generate 10 aptitude questions in JSON format. Return ONLY the JSON object.
      
      Output format:
      {
        "questions": [
          {
            "question": "text",
            "options": ["A) opt1", "B) opt2", "C) opt3", "D) opt4"],
            "correct_answer": "A",
            "explanation": "summary"
          }
        ]
      }`
    }
  ];

  const response = await callAI(messages, 4000, 0.7);
  return JSON.parse(cleanJsonResponse(response));
}

/**
 * Extract structured information from raw resume text
 */
export async function analyzeResumeText(resumeText: string): Promise<ResumeAnalysisResult> {
  const messages: Message[] = [
    {
      role: 'system',
      content: 'You are a precise resume parser. Extract structured data faithfully. Return ONLY valid JSON.'
    },
    {
      role: 'user',
      content: `Extract the following data from the resume text provided below. 
      If any information is missing, use "Not specified" for strings or [] for arrays.
      
      Required JSON structure:
      {
        "summary": "Brief professional summary",
        "years_of_experience": 5,
        "skills": ["Skill 1", "Skill 2"],
        "roles": ["Recent Role 1"],
        "companies": ["Company 1"],
        "education": ["Degree from University"],
        "projects": [{ "title": "Project Title", "technologies": ["Tech 1"], "description": "Brief desc" }]
      }

      Resume Text:
      ${resumeText.slice(0, 10000)}`
    }
  ];

  const response = await callAI(messages, 2000, 0.1);
  const cleaned = cleanJsonResponse(response);
  try {
    return JSON.parse(cleaned) as ResumeAnalysisResult;
  } catch (e) {
    console.error("Failed to parse resume analysis JSON:", cleaned);
    throw e;
  }
}

/**
 * Generate coding problems for a specific role and company
 */
export async function generateCodingProblems(company: string, role: string) {
  const messages: Message[] = [
    {
      role: 'system',
      content: `Generate 3 medium-difficulty coding problems for a ${role} position at ${company}.`
    },
    {
      role: 'user',
      content: `Return in this JSON format:
      {
        "problems": [
          {
            "title": "Problem title",
            "description": "description",
            "example_input": "input",
            "example_output": "output",
            "test_cases": [{"input": "in", "expected_output": "out"}],
            "difficulty": "Medium"
          }
        ]
      }`
    }
  ];

  const response = await callAI(messages, 3000, 0.7);
  return JSON.parse(cleanJsonResponse(response));
}

/**
 * Interactive AI Interview Chat
 */
export async function generateAIInterviewResponse(
  company: string,
  role: string,
  message: string,
  conversationHistory: Array<{ role: string, content: string }> = [],
  resumeData?: string,
  projects?: string[]
) {
  const systemPrompt = `You are an interviewer for a ${role} position at ${company}. Ask one question at a time. Start with introductions, then behavioral, then technical.`;

  let contextMessage = message;
  if (conversationHistory.length > 2 && (resumeData || projects)) {
    contextMessage += `\n\nContext: ${resumeData || ''} ${projects?.join(', ') || ''}`;
  }

  const messages: Message[] = [
    { role: 'system', content: systemPrompt },
    ...conversationHistory.map(msg => ({ role: msg.role as any, content: msg.content })),
    { role: 'user', content: contextMessage }
  ];

  return await callAI(messages, 500, 0.8);
}

/**
 * Provide detailed feedback on interview performance
 */
export async function generateFinalFeedback(
  company: string,
  role: string,
  scores: { aptitude: number; coding: number; interview: number }
) {
  const totalScore = Math.round((scores.aptitude + scores.coding + scores.interview) / 3);
  const prompt = `Analyze performance for a ${role} at ${company}. Scores: Aptitude ${scores.aptitude}%, Coding ${scores.coding}%, Interview ${scores.interview}%.`;

  const messages: Message[] = [
    { role: 'system', content: 'You are an HR expert. Provide constructive feedback in JSON.' },
    { role: 'user', content: `${prompt} Return JSON with: overall_score, performance_analysis, strengths[], areas_for_improvement[], company_specific_feedback, next_steps[], confidence_rating (1-10).` }
  ];

  const response = await callAI(messages, 1500, 0.7);
  return JSON.parse(cleanJsonResponse(response));
}

/**
 * Automated code evaluation
 */
export async function evaluateCodeSolution(
  problemTitle: string,
  problemDescription: string,
  testCases: Array<{ input: string; expected_output: string }>,
  userCode: string,
  language: string = 'python'
) {
  const messages: Message[] = [
    {
      role: 'system',
      content: 'You are a code reviewer. Evaluate the correctness of the code against test cases.'
    },
    {
      role: 'user',
      content: `Problem: ${problemTitle}\nCode: ${userCode}\nTest Cases: ${JSON.stringify(testCases)}\nReturn JSON with: is_correct, score, feedback, test_results[], suggestions[].`
    }
  ];

  const response = await callAI(messages, 1000, 0.3);
  return JSON.parse(cleanJsonResponse(response));
}

/**
 * Get current API status
 */
export function getAPIStatus() {
  return {
    gemini: true,
    engine: 'Gemini 1.5 Flash',
    proxy: 'Active'
  };
}
