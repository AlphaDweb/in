import type { VercelRequest, VercelResponse } from '@vercel/node';

// Get Gemini API key from environment
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY1 || process.env.VITE_GEMINI_API_KEY;
let GEMINI_API_URL = process.env.VITE_GEMINI_API_URL || 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview';
if (!GEMINI_API_URL.includes(':generateContent')) {
    GEMINI_API_URL += ':generateContent';
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // Only allow POST requests
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // Check if we have API key
    if (!GEMINI_API_KEY) {
        return res.status(500).json({
            error: 'No Gemini API key configured on server. Please set VITE_GEMINI_API_KEY1 or VITE_GEMINI_API_KEY'
        });
    }

    try {
        const { messages, maxTokens = 1000, temperature = 0.7 } = req.body;

        if (!messages || !Array.isArray(messages)) {
            return res.status(400).json({ error: 'Invalid request: messages array required' });
        }

        // Convert OpenAI format to Gemini format
        const geminiMessages: any[] = [];

        for (const message of messages) {
            if (message.role === 'system') {
                // Gemini doesn't have system messages, prepend to first user message
                if (geminiMessages.length === 0) {
                    geminiMessages.push({
                        role: 'user',
                        parts: [{ text: `System: ${message.content}\n\n` }]
                    });
                } else {
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

        // Call Gemini API using header for better security
        const response = await fetch(GEMINI_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-goog-api-key': GEMINI_API_KEY
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
            const errorData = await response.json() as any;
            throw new Error(errorData.error?.message || `Gemini API Error: ${response.status}`);
        }

        const data = await response.json() as any;
        if (!data.candidates || !data.candidates[0].content.parts[0].text) {
            throw new Error('Unexpected response format from Gemini API');
        }

        return res.status(200).json({
            text: data.candidates[0].content.parts[0].text,
            keyIndex: 0,
            totalKeys: 1
        });

    } catch (error: any) {
        console.error('Gemini API proxy error:', error);
        return res.status(500).json({
            error: error.message || 'Internal server error'
        });
    }
}
