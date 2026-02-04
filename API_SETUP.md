# API Proxy Setup

## Overview

This project uses a serverless API proxy to handle Gemini API calls. This solves the CORS (Cross-Origin Resource Sharing) issue that occurs when making direct API calls from the browser to Google's Generative Language API.

## Why Use a Proxy?

1. **CORS Prevention**: Google's Gemini API doesn't allow direct browser calls
2. **Security**: API keys are stored securely on the server, not exposed in the browser
3. **Key Management**: Server-side key rotation and failover handling

## Architecture

```
Browser (Frontend)
    ↓
    → /api/gemini (Vercel Serverless Function)
        ↓
        → Google Gemini API
```

## Setup

### 1. Environment Variables

Add your Gemini API keys to your environment:

**For Local Development:**
Create a `.env` file in the root directory:
```bash
VITE_GEMINI_API_KEY1=your_api_key_here
```

**For Vercel Deployment:**
1. Go to your Vercel project dashboard
2. Navigate to Settings → Environment Variables
3. Add your API keys:
   - `VITE_GEMINI_API_KEY1`
   - `VITE_GEMINI_API_KEY2` (optional, for failover)
   - etc.

### 2. Deploy

The API proxy will automatically deploy with your Vercel deployment. No additional configuration needed!

## API Endpoint

### POST `/api/gemini`

**Request Body:**
```json
{
  "messages": [
    { "role": "system", "content": "You are a helpful assistant" },
    { "role": "user", "content": "Hello!" }
  ],
  "maxTokens": 1000,
  "temperature": 0.7,
  "keyIndex": 0
}
```

**Response:**
```json
{
  "text": "AI response text here",
  "keyIndex": 0,
  "totalKeys": 2
}
```

**Error Response:**
```json
{
  "error": "Error message",
  "keyIndex": 0,
  "totalKeys": 2
}
```

## Key Rotation

The proxy supports multiple API keys for automatic failover:
- If one key hits quota limits, it automatically tries the next key
- Keys are rotated per session to distribute load
- Configure multiple keys using `VITE_GEMINI_API_KEY1`, `VITE_GEMINI_API_KEY2`, etc.

## Local Testing

To test the API proxy locally with Vercel:

```bash
# Install Vercel CLI
npm install -g vercel

# Run local development server
vercel dev
```

This will start a local server that mimics the Vercel serverless environment.

## Troubleshooting

### "No Gemini API keys configured on server"
- Make sure you've added environment variables to Vercel
- Redeploy after adding environment variables

### CORS errors still appearing
- Clear your browser cache
- Make sure you're calling `/api/gemini` not the direct Gemini URL
- Check that the deployment was successful

### API calls failing
- Verify your API keys are valid in Google Cloud Console
- Check Vercel function logs for detailed error messages
- Ensure you haven't exceeded Gemini API quotas
