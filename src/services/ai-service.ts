// AI Service - Supports both OpenAI and Gemini APIs

// Configuration
const OPENAI_API_KEY = undefined; // OpenAI disabled
const GEMINI_API_URL = import.meta.env.VITE_GEMINI_API_URL || 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

// Collect Gemini API keys from env
function collectGeminiKeys(): string[] {
  const keys: string[] = [];
  const csv = (import.meta.env as any).VITE_GEMINI_API_KEYS as string | undefined;
  if (csv) {
    csv.split(',').map(k => k.trim()).filter(Boolean).forEach(k => keys.push(k));
  }
  // Also support numbered keys VITE_GEMINI_API_KEY1..VITE_GEMINI_API_KEY20
  for (let i = 1; i <= 20; i++) {
    const key = (import.meta.env as any)[`VITE_GEMINI_API_KEY${i}`] as string | undefined;
    if (key) keys.push(key);
  }
  // Backward compat: single VITE_GEMINI_API_KEY
  const single = (import.meta.env as any).VITE_GEMINI_API_KEY as string | undefined;
  if (single) keys.push(single);
  // De-duplicate
  return Array.from(new Set(keys));
}

const GEMINI_API_KEYS: string[] = collectGeminiKeys();

// Optional: separate key pool for resume analysis
function collectResumeGeminiKeys(): string[] {
  const keys: string[] = [];
  const csv = (import.meta.env as any).VITE_GEMINI_RESUME_KEYS as string | undefined;
  if (csv) {
    csv.split(',').map(k => k.trim()).filter(Boolean).forEach(k => keys.push(k));
  }
  for (let i = 1; i <= 20; i++) {
    const key = (import.meta.env as any)[`VITE_GEMINI_RESUME_KEY${i}`] as string | undefined;
    if (key) keys.push(key);
  }
  return Array.from(new Set(keys));
}

const GEMINI_RESUME_API_KEYS: string[] = collectResumeGeminiKeys();

// API Selection (Gemini only)
const getAPIType = (): 'gemini' => {
  if (GEMINI_API_KEYS.length > 0) return 'gemini';
  throw new Error('No AI API key configured. Please set VITE_GEMINI_API_KEYS or VITE_GEMINI_API_KEY1..n');
};

// Session-based key assignment and rotation
const SESSION_KEY = 'gemini_session_key_index';
const DEVICE_RR_KEY = 'gemini_device_rr_index';

function getOrCreateSessionKeyIndex(total: number): number {
  if (total <= 0) return 0;
  try {
    const existing = sessionStorage.getItem(SESSION_KEY);
    if (existing !== null) {
      const idx = parseInt(existing, 10);
      if (!Number.isNaN(idx) && idx >= 0 && idx < total) return idx;
    }
    // Round-robin per device
    let deviceIndex = 0;
    const raw = localStorage.getItem(DEVICE_RR_KEY);
    if (raw !== null) {
      const parsed = parseInt(raw, 10);
      if (!Number.isNaN(parsed)) deviceIndex = parsed;
    }
    const newIndex = (deviceIndex + 1) % total;
    localStorage.setItem(DEVICE_RR_KEY, String(newIndex));
    sessionStorage.setItem(SESSION_KEY, String(newIndex));
    return newIndex;
  } catch {
    // Fallback without storage
    return 0;
  }
}

function setSessionKeyIndex(index: number) {
  try {
    sessionStorage.setItem(SESSION_KEY, String(index));
  } catch {}
}

// Interfaces
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

interface GeminiMessage {
  role: 'user' | 'model';
  parts: Array<{
    text: string;
  }>;
}

interface GeminiResponse {
  candidates: Array<{
    content: {
      parts: Array<{
        text: string;
      }>;
    };
  }>;
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

// OpenAI API Call
async function callOpenAI(messages: OpenAIMessage[], maxTokens: number = 1000, temperature: number = 0.7): Promise<string> {
  if (!OPENAI_API_KEY) {
    throw new Error('OpenAI API key not configured');
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
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

// Gemini API Call
async function callGeminiWithKey(apiKey: string, messages: OpenAIMessage[], maxTokens: number = 1000, temperature: number = 0.7): Promise<string> {
  if (!apiKey) {
    throw new Error('Gemini API key not configured');
  }

  // Convert OpenAI format to Gemini format
  const geminiMessages: GeminiMessage[] = [];
  
  for (const message of messages) {
    if (message.role === 'system') {
      // Gemini doesn't have system messages, so we prepend to the first user message
      if (geminiMessages.length === 0) {
        geminiMessages.push({
          role: 'user',
          parts: [{ text: `System: ${message.content}\n\n` }]
        });
      } else {
        // If there are already messages, prepend to the first user message
        geminiMessages[0].parts[0].text = `System: ${message.content}\n\n${geminiMessages[0].parts[0].text}`;
      }
    } else if (message.role === 'user') {
      geminiMessages.push({
        role: 'user',
        parts: [{ text: message.content }]
      });
    } else if (message.role === 'assistant') {
      geminiMessages.push({
        role: 'model',
        parts: [{ text: message.content }]
      });
    }
  }

  const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: geminiMessages,
      generationConfig: {
        maxOutputTokens: maxTokens,
        temperature: temperature,
      },
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Gemini API error: ${error.error?.message || 'Unknown error'}`);
  }

  const data: GeminiResponse = await response.json();
  return data.candidates[0].content.parts[0].text;
}

// Universal API Call (Gemini only with multi-key failover)
async function callAI(messages: OpenAIMessage[], maxTokens: number = 1000, temperature: number = 0.7): Promise<string> {
  if (GEMINI_API_KEYS.length === 0) {
    throw new Error('No Gemini API keys configured');
  }

  // Determine starting key for this session
  let startIndex = getOrCreateSessionKeyIndex(GEMINI_API_KEYS.length);

  // Try keys in a circular manner, starting from session index
  let lastError: any = null;
  for (let attempt = 0; attempt < GEMINI_API_KEYS.length; attempt++) {
    const keyIndex = (startIndex + attempt) % GEMINI_API_KEYS.length;
    const apiKey = GEMINI_API_KEYS[keyIndex];
    try {
      const result = await callGeminiWithKey(apiKey, messages, maxTokens, temperature);
      // Persist successful key for the session
      setSessionKeyIndex(keyIndex);
      return result;
    } catch (error: any) {
      lastError = error;
      const msg = String(error?.message || '').toLowerCase();
      // On quota/rate/auth/network errors, continue to next key
      const shouldFailover =
        msg.includes('quota') ||
        msg.includes('rate') ||
        msg.includes('exceed') ||
        msg.includes('429') ||
        msg.includes('permission') ||
        msg.includes('key') ||
        msg.includes('unauthorized') ||
        msg.includes('network') ||
        msg.includes('unavailable');
      if (!shouldFailover) {
        // If error seems unrelated, stop early
        break;
      }
      // else try next key
    }
  }
  throw lastError || new Error('All Gemini keys failed');
}

// Internal helper: try a provided keys array (used for resume pool)
async function callAIWithKeys(keys: string[], messages: OpenAIMessage[], maxTokens: number = 1000, temperature: number = 0.7): Promise<string> {
  if (!keys || keys.length === 0) return callAI(messages, maxTokens, temperature);
  let lastError: any = null;
  for (let i = 0; i < keys.length; i++) {
    try {
      return await callGeminiWithKey(keys[i], messages, maxTokens, temperature);
    } catch (e) {
      lastError = e;
      continue;
    }
  }
  throw lastError || new Error('All provided Gemini keys failed');
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

  const response = await callAI(messages, 4000, 0.7);
  const cleanedResponse = cleanJsonResponse(response);
  return JSON.parse(cleanedResponse);
}

// Analyze Resume Text → Structured JSON
export async function analyzeResumeText(resumeText: string): Promise<ResumeAnalysisResult> {
  const messages: OpenAIMessage[] = [
    {
      role: 'system',
      content:
        'You are a precise resume parser. Extract structured data faithfully without inventing facts. If a field is unknown, use null or an empty list. Return ONLY valid JSON matching the schema.'
    },
    {
      role: 'user',
      content: `Extract a structured summary from this resume text.
Return JSON with this exact shape:
{
  "summary": string,
  "years_of_experience": number | null,
  "skills": string[],
  "roles": string[],
  "companies": string[],
  "education": string[],
  "projects": [
    { "title": string, "technologies": string[], "description": string }
  ]
}

Resume Text:
${resumeText}`
    }
  ];

  const response = await callAIWithKeys(GEMINI_RESUME_API_KEYS, messages, 1200, 0.2);
  const cleaned = cleanJsonResponse(response);
  return JSON.parse(cleaned) as ResumeAnalysisResult;
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

  const response = await callAI(messages, 3000, 0.7);
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
  const systemPrompt = `You are conducting a professional interview for a ${role} position at ${company}. 

Interview Structure - Follow this order:
1. BASIC INTRODUCTION (Start here)
   - Ask about their background and experience
   - Why they're interested in this role/company
   - What they're looking for in their next position

2. BEHAVIORAL QUESTIONS
   - Ask about past experiences and achievements
   - How they handle challenges and teamwork
   - Leadership and communication examples

3. TECHNICAL QUESTIONS (Only after basics)
   - Ask about relevant technical skills
   - Problem-solving approaches
   - Experience with specific technologies

4. COMPANY/ROLE SPECIFIC
   - Questions about the role and company
   - How they would contribute to the team
   - Their questions for the interviewer

Guidelines:
- Start with basic, friendly questions
- Build rapport before diving into technical details
- Ask follow-up questions based on their responses
- Be conversational and encouraging
- Reference their resume/projects only after establishing basics
- Keep questions relevant to the ${role} position at ${company}

Current conversation stage: ${conversationHistory.length <= 2 ? 'BASIC INTRODUCTION' : conversationHistory.length <= 6 ? 'BEHAVIORAL QUESTIONS' : conversationHistory.length <= 10 ? 'TECHNICAL QUESTIONS' : 'COMPANY/ROLE SPECIFIC'}

Be natural, friendly, and professional. Ask one question at a time.`;

  let contextMessage = message;
  
  // Only add resume/project context after basic introduction phase
  if (conversationHistory.length > 2 && (resumeData || projects)) {
    contextMessage += `\n\nAdditional context about the candidate:
${resumeData ? `Resume Summary: ${resumeData}` : ''}
${projects && projects.length > 0 ? `Projects: ${projects.join(', ')}` : ''}

Use this information to ask more specific questions about their experience and projects.`;
  }

  const messages: OpenAIMessage[] = [
    { role: 'system', content: systemPrompt },
    ...conversationHistory.map(msg => ({ role: msg.role as 'user' | 'assistant', content: msg.content })),
    { role: 'user', content: contextMessage }
  ];

  return await callAI(messages, 500, 0.8);
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

  const response = await callAI(messages, 1500, 0.7);
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

  const response = await callAI(messages, 1000, 0.3);
  const cleanedResponse = cleanJsonResponse(response);
  return JSON.parse(cleanedResponse);
}

// Get current API status
export function getAPIStatus() {
  const geminiAvailable = GEMINI_API_KEYS.length > 0;
  let activeIndex: number | null = null;
  try {
    const existing = sessionStorage.getItem(SESSION_KEY);
    activeIndex = existing !== null ? parseInt(existing, 10) : null;
  } catch {
    activeIndex = null;
  }
  
  return {
    gemini: geminiAvailable,
    current: getAPIType(),
    keysConfigured: GEMINI_API_KEYS.length,
    resumeKeysConfigured: GEMINI_RESUME_API_KEYS.length,
    activeKeyIndex: activeIndex,
    fallback: GEMINI_API_KEYS.length > 1
  };
}
