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
async function callGemini(messages: Message[], maxTokens: number = 1000, temperature: number = 0.7, retryCount: number = 0): Promise<string> {
  const isLocal = window.location.hostname.includes('localhost');

  // 1. Try the serverless API proxy (Skip for local dev to avoid console clutter)
  if (!isLocal) {
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

      if (response.status === 429 || response.status === 503) {
        if (retryCount < 3) {
          await new Promise(r => setTimeout(r, 2000 * (retryCount + 1)));
          return callGemini(messages, maxTokens, temperature, retryCount + 1);
        }
      }
    } catch (err) {
      console.warn("Proxy call failed", err);
      // Only fallback if we are on localhost
      if (!isLocal) {
        throw new Error("API call failed through proxy. Please check your hosting environment configuration.");
      }
    }
  }

  // 2. Fallback for Local Development (npm run dev)
  if (!isLocal) {
    throw new Error('Direct API calls are disabled in production. Ensure the /api/gemini proxy is functional.');
  }

  const localApiKey = import.meta.env.VITE_GEMINI_API_KEY1 || import.meta.env.VITE_GEMINI_API_KEY;

  // Strictly use only the user's specified model
  const modelToUse = 'gemini-3-flash-preview';
  const localApiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelToUse}:generateContent`;

  console.log(`[AI-Service] Attempting with model: ${modelToUse} (Attempt ${retryCount + 1})`);

  if (!localApiKey) {
    throw new Error('Gemini API key not configured. Please check your .env file.');
  }

  // Convert Message to Gemini format
  const geminiMessages = messages.map(msg => ({
    role: msg.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: msg.content }]
  }));

  try {
    const response = await fetch(localApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': localApiKey
      },
      body: JSON.stringify({
        contents: geminiMessages,
        generationConfig: { maxOutputTokens: maxTokens, temperature: temperature }
      }),
    });

    if (response.ok) {
      const data = await response.json();
      return data.candidates[0].content.parts[0].text;
    }

    let errorMessage = "";
    let retryDelay = 2000 * (retryCount + 1);

    try {
      const error = await response.json();
      errorMessage = error.error?.message || "";
      const secondsMatch = errorMessage.match(/retry in ([\d.]+)s/);
      if (secondsMatch) {
        retryDelay = Math.ceil(parseFloat(secondsMatch[1]) * 1000) + 1000;
      }
    } catch (e) {
      errorMessage = `API Error (${response.status})`;
    }

    if ((response.status === 429 || response.status === 503 || response.status === 404) && retryCount < 5) {
      console.warn(`[AI-Service] Waiting for API quota (${response.status}). ${errorMessage}. Retrying in ${Math.round(retryDelay / 1000)}s... (Attempt ${retryCount + 1}/5)`);

      // Countdown log for better visibility
      for (let i = Math.round(retryDelay / 1000); i > 0; i--) {
        if (i % 2 === 0 || i <= 3) console.log(`[AI-Service] Resuming in ${i}s...`);
        await new Promise(r => setTimeout(r, 1000));
      }

      return callGemini(messages, maxTokens, temperature, retryCount + 1);
    }

    // Special case for quota exceeded with no more retries
    if (response.status === 429) {
      throw new Error(`Gemini API Quota Exceeded. Please wait 1-2 minutes for the cooldown and click the 'Retry' button. Details: ${errorMessage}`);
    }

    throw new Error(errorMessage || `Gemini API Error (${response.status})`);
  } catch (err: any) {
    // Basic network fallback
    if (err.message?.includes('Failed to fetch') && retryCount < 2) {
      await new Promise(r => setTimeout(r, 1000));
      return callGemini(messages, maxTokens, temperature, retryCount + 1);
    }
    throw err;
  }
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

  // 2. Find the first '{' 
  const firstBrace = cleaned.indexOf('{');
  if (firstBrace === -1) return cleaned.trim();

  cleaned = cleaned.substring(firstBrace);

  // 3. Robust fix for truncated JSON: Balance braces and brackets
  let stack = [];
  let result = "";
  let inString = false;
  let escaped = false;

  for (let i = 0; i < cleaned.length; i++) {
    const char = cleaned[i];

    // Replace actual newlines inside strings with \n to prevent Parse Error
    if (inString && (char === '\n' || char === '\r')) {
      result += '\\n';
      continue;
    }

    result += char;

    if (char === '"' && !escaped) {
      inString = !inString;
    }

    if (!inString) {
      if (char === '{' || char === '[') {
        stack.push(char === '{' ? '}' : ']');
      } else if (char === '}' || char === ']') {
        if (stack.length > 0 && stack[stack.length - 1] === char) {
          stack.pop();
        }
      }
    }

    escaped = char === '\\' && !escaped;
  }

  // 4. Handle unterminated strings
  let trimmedResult = result.trim();
  if (inString) {
    trimmedResult += '"';
  }

  // 5. Handle trailing comma if truncated right after a comma
  if (trimmedResult.endsWith(',')) {
    trimmedResult = trimmedResult.substring(0, trimmedResult.length - 1);
  }

  // 6. If the stack is not empty, we need to close the tags
  while (stack.length > 0) {
    const closing = stack.pop();
    trimmedResult += closing;
  }

  return trimmedResult.trim();
}

// --- Specific AI Functions ---

/**
 * Generate aptitude questions for a specific role and company
 */
export async function generateAptitudeQuestions(company: string, role: string) {
  const messages: Message[] = [
    {
      role: 'system',
      content: `You are an expert recruiter for ${company}. Generate exactly 30 multiple choice questions for a ${role} position. 
      Focus on logical reasoning, quantitative aptitude, and verbal ability. Ensure the output is a valid JSON object.
      You MUST provide exactly 30 questions. Each question must be unique and relevant.`
    },
    {
      role: 'user',
      content: `Generate 30 aptitude questions in JSON format. Return ONLY the JSON object.
      
      Output format:
      {
        "questions": [
          {
            "question": "question text",
            "options": ["A) opt1", "B) opt2", "C) opt3", "D) opt4"],
            "correct_answer": "A",
            "explanation": "short explanation"
          }
        ]
      }`
    }
  ];

  try {
    console.log("[AI-Service] Generating 30 aptitude questions in a single request...");
    const response = await callAI(messages, 8000, 0.7);
    const cleaned = cleanJsonResponse(response);
    const data = JSON.parse(cleaned);
    const allQuestions = data.questions || [];

    if (allQuestions.length < 5) {
      // If the AI fails to generate high count, it might be due to complexity, but we need 30
      throw new Error(`AI generated too few questions (${allQuestions.length}).`);
    }

    console.log(`[AI-Service] Successfully generated ${allQuestions.length} questions.`);
    return { questions: allQuestions };
  } catch (e) {
    console.error("Error generating aptitude questions:", e);
    throw new Error("Gemini is currently busy or the request timed out. Please click the 'Retry' button in a moment.");
  }
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

  const response = await callAI(messages, 4000, 0.1);
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
      content: `You are a technical interviewer for ${company}. Generate exactly 3 coding problems for a ${role} position.
      
      STRICT RULES:
      1. LANGUAGE AGNOSTIC: Do NOT specify a required programming language (like Java, Python, or JavaScript) in the description. The user should be able to solve it in any language.
      2. GENERIC SIGNATURES: Use language-neutral function names.
      3. JSON ONLY: Return ONLY a valid JSON object.`
    },
    {
      role: 'user',
      content: `Generate 3 coding problems in JSON format for ${role}.
      
      Output format:
      {
        "problems": [
          {
            "title": "Problem title",
            "description": "Problem description. NO language requirements.",
            "function_signature": "solve(input)",
            "example_input": "input",
            "example_output": "output",
            "test_cases": [{"input": "in", "expected_output": "out"}],
            "difficulty": "Medium",
            "tags": ["algorithm"]
          }
        ]
      }`
    }
  ];

  const response = await callAI(messages, 4000, 0.7);
  return JSON.parse(cleanJsonResponse(response));
}

export async function generateAIInterviewResponse(
  company: string,
  role: string,
  message: string,
  conversationHistory: Array<{ role: string, content: string }> = [],
  resumeData?: string,
  projects?: string[],
  scores?: { aptitude?: number; coding?: number }
) {
  const scoresContext = scores ? `Candidate Round Scores: Aptitude ${scores.aptitude || 'N/A'}%, Coding ${scores.coding || 'N/A'}%.` : '';

  // Include resume context in system prompt instead of every turn to save tokens
  const resumeContext = resumeData ? `\n\nCandidate Resume Context:\n${resumeData.slice(0, 4000)}` : '';
  const projectsContext = projects?.length ? `\n\nCandidate Projects:\n${projects.join(', ')}` : '';

  const systemPrompt = `You are a professional HR/Technical interviewer for a ${role} position at ${company}. 
  Ask one question at a time. 
  Follow this structured interview flow:
  1. Brief introduction.
  2. Behavioral questions based on projects and resume.
  3. Technical questions related to the candidate's skills and the ${role} domain.
  4. Discussion of previous round performance if applicable: ${scoresContext}.
  
  Keep responses concise, natural, and conversational.
  Do not provide feedback or scores during the conversation.
  ${resumeContext}
  ${projectsContext}
  
  Maintain a professional but encouraging persona.`;

  // Limit conversation history to prevent token limit issues
  const recentHistory = conversationHistory.slice(-10).map(msg => ({
    role: (msg.role === 'assistant' ? 'assistant' : 'user') as any,
    content: msg.content
  }));

  const messages: Message[] = [
    { role: 'system', content: systemPrompt },
    ...recentHistory,
    { role: 'user', content: message }
  ];

  return await callAI(messages, 1000, 0.7);
}

/**
 * Strictly evaluate the AI Interview conversation
 */
export async function evaluateInterviewPerformance(
  role: string,
  company: string,
  conversationHistory: Array<{ role: string, content: string }>
) {
  // Limit history for evaluation to prevent token overflow
  const trimmedHistory = conversationHistory.slice(-15);
  const historyText = trimmedHistory
    .map(m => `${m.role.toUpperCase()}: ${m.content}`)
    .join('\n\n');

  const messages: Message[] = [
    {
      role: 'system',
      content: `You are a critical, high-level technical recruiter for ${company}. 
      Evaluate the candidate's interview performance based on the provided transcript.
      
      STRICT EVALUATION RULES:
      1. TECHNICAL SCORE: Check for accuracy. If they gave wrong technical answers or were vague about skills from their resume, score them strictly low (below 50).
      2. COMMUNICATION SCORE: Check for clarity and structure. If they avoid questions or give one-word answers, be honest.
      3. No generic praise. 
      4. Compare their answers to industry standards for a ${role}.
      
      Return ONLY a JSON object.`
    },
    {
      role: 'user',
      content: `Analyze this interview transcript for a ${role} position:\n\n${historyText}\n\n
      Return JSON format:
      {
        "score": number (0-100),
        "technical_rating": number (0-100),
        "communication_rating": number (0-100),
        "mistakes": ["specific mistake 1", "mistake 2"],
        "technical_feedback": "Detailed critical feedback",
        "communication_feedback": "Detailed critical feedback"
      }`
    }
  ];

  try {
    const response = await callAI(messages, 1500, 0.1);
    const cleaned = cleanJsonResponse(response);
    try {
      return JSON.parse(cleaned);
    } catch (parseError) {
      console.error("Interview evaluation JSON repair needed", cleaned);
      const fixed = cleaned.trim().replace(/}[^}]*$/, '}');
      return JSON.parse(fixed);
    }
  } catch (error) {
    console.error("Final interview evaluation failed:", error);
    throw error;
  }
}

/**
 * Provide strict, data-driven final evaluation
 */
export async function generateFinalFeedback(
  company: string,
  role: string,
  scores: { aptitude: number; coding: number; interview: number }
) {
  const messages: Message[] = [
    {
      role: 'system',
      content: `You are the lead recruitment auditor at ${company}. 
      Generate a final, honest, and high-stakes assessment report for a ${role} candidate.
      
      CRITICAL REPORTING RULES:
      1. DATA-DRIVEN: Use the exact scores provided.
      2. NO ASSUMPTIONS: If a score is low, mark the candidate as "Not Ready" or "Partially Ready".
      3. HONEST FEEDBACK: Clearly identify skill gaps. If they failed coding but did well in others, highlight that they lack fundamental implementation skills.
      
      Return results in JSON.`
    },
    {
      role: 'user',
      content: `Full Assessment Data for ${role}:
      - Aptitude Score: ${scores.aptitude}%
      - Coding Score: ${scores.coding}%
      - AI Interview Score: ${scores.interview}%
      
      Return JSON structure:
      {
        "overall_summary": "Concise executive summary",
        "performance_breakdown": {
          "aptitude": "Detailed analysis of reasoning",
          "coding": "Strict analysis of logic/accuracy",
          "interview": "Tough critique of comms and tech depth"
        },
        "mistakes_identified": ["specific mistake 1", ...],
        "skill_gaps": ["gap 1", ...],
        "improvement_suggestions": ["suggestion 1", ...],
        "readiness_recommendation": "Ready / Partially Ready / Not Ready",
        "confidence_rating": number (1-10)
      }`
    }
  ];

  try {
    const response = await callAI(messages, 2000, 0.1); // Lower temperature for report
    const cleaned = cleanJsonResponse(response);
    try {
      return JSON.parse(cleaned);
    } catch (parseError) {
      const fixed = cleaned.trim().replace(/}[^}]*$/, '}');
      return JSON.parse(fixed);
    }
  } catch (error) {
    console.error("Final report generation failed:", error);
    throw error;
  }
}

/**
 * Validate code syntax and base logic structure before running test cases
 */
export async function validateCodeStructure(
  userCode: string,
  problemTitle: string,
  problemDescription: string,
  language: string = 'python'
) {
  const messages: Message[] = [
    {
      role: 'system',
      content: `You are a strict code validator. Your job is to check if the provided code is syntactically correct for the user-selected language.
      
      CRITICAL RULES:
      1. TRUST THE LANGUAGE PARAMETER: If the user says the language is 'java', evaluate it as Java. Ignore any 'JavaScript' or 'Python' mentions in the problem description as they are just examples.
      2. BE FAIR: Don't fail the user if they write valid algorithm code in their chosen language just because the problem had an example in another language.
      3. SYNTAX CHECK: Only fail if there are REAL syntax errors or the logic is completely broken.
      
      Return ONLY a JSON object.`
    },
    {
      role: 'user',
      content: `LANGUAGE: ${language}
      PROBLEM: ${problemTitle}
      DESCRIPTION: ${problemDescription}
      USER CODE:
      ${userCode}
      
      Return JSON:
      {
        "is_valid": boolean,
        "error_type": "syntax" | "logic" | "none",
        "error_message": "Clear explanation",
        "suggestions": ["suggestion"]
      }`
    }
  ];

  try {
    const response = await callAI(messages, 1500, 0.1);
    return JSON.parse(cleanJsonResponse(response));
  } catch (error) {
    console.error("Validation logic error:", error);
    return { is_valid: false, error_type: "logic", error_message: "Failed to validate code structure. Please check your syntax manually." };
  }
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
      content: `You are a high-level code reviewer and algorithmic expert. 
      Evaluate the user's code based on:
      1. Functional correctness (Logic matching the problem)
      2. Adherence to constraints
      3. Efficiency (Time/Space complexity)
      
      CRITICAL RULES:
      - LANGUAGE: The user is using ${language}. Evaluate it strictly as ${language} code.
      - IGNORE DEFAULTS: If the problem description or examples were in another language, ignore them. Trust the ${language} syntax provided.
      - STAGGERED JSON: You MUST return a complete, valid JSON object. Do NOT truncate. 
      - FLEXIBILITY: Be flexible with parameter names as long as logic is correct. 
      Return results in JSON format.`
    },
    {
      role: 'user',
      content: `Problem: ${problemTitle}\nDescription: ${problemDescription}\nUser Code:\n${userCode}\nTest Cases: ${JSON.stringify(testCases)}\n
      
      Return JSON with exactly these fields:
      {
        "is_correct": boolean,
        "score": number,
        "feedback": "string",
        "test_results": [{"input": "string", "expected": "string", "actual": "string", "passed": boolean}],
        "suggestions": ["string"]
      }`
    }
  ];

  try {
    const response = await callAI(messages, 2500, 0.2);
    const cleaned = cleanJsonResponse(response);

    // Robust parsing
    try {
      return JSON.parse(cleaned);
    } catch (parseError) {
      console.error("Initial JSON parse failed, attempting secondary cleanup", cleaned);
      // Secondary cleanup for common AI truncation/formatting issues
      const fixed = cleaned.trim().replace(/}[^}]*$/, '}'); // Try to find last brace
      return JSON.parse(fixed);
    }
  } catch (error) {
    console.error("Code evaluation error:", error);
    throw new Error("Failed to evaluate code. The AI response was malformed. Please try again or simplify your code.");
  }
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
