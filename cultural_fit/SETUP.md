# Setup Guide for Real API Testing

## Prerequisites

1. **Groq API Key**: Get your API key from [Groq Console](https://console.groq.com/)
2. **Environment Variables**: Create a `.env` file in the project root

## Setup Steps

### 1. Create `.env` file

Create a `.env` file in the project root (`/Users/valentinhenryleo/iterate-hackathon/.env`) with:

```env
GROQ_API_KEY=your_groq_api_key_here
```

Replace `your_groq_api_key_here` with your actual Groq API key.

### 2. Verify Installation

Make sure the required packages are installed:

```bash
npm install
```

This should install:
- `groq-sdk` - Groq API client
- `dotenv` - Environment variable loader

### 3. Test with Real API

Run the real API test:

```bash
npm run test:cultural-fit:real
```

Or directly:

```bash
npx tsx cultural_fit/test-real-api.ts
```

## What the Real API Test Does

The test will:
1. ✅ Check if `GROQ_API_KEY` is set
2. 🧪 Run 3 test cases with real API calls to `llama-4-maverick`
3. ⏱️ Show API response times
4. 📊 Display the cultural fit evaluation results

## Expected Output

```
🚀 Testing Cultural Fit Detection with REAL Groq API
============================================================
✅ GROQ_API_KEY found
📦 Model: llama-4-maverick

🧪 Test 1: Blame Shifting (Negative Signal)
────────────────────────────────────────────────────────────
⏳ Calling Groq API...
⏱️  API call took 1234ms

Result: {
  "cultural_score": 54,
  "trend": "-4",
  "signals": [...],
  "label": "Moderate Fit"
}
✅ Test 1 passed!
```

## Troubleshooting

### Error: "GROQ_API_KEY not found"

- Make sure `.env` file exists in the project root
- Check that the file contains: `GROQ_API_KEY=your_key`
- No quotes around the key value
- No spaces around the `=` sign

### Error: "Groq API error"

- Verify your API key is valid
- Check your Groq account has credits/quota
- Ensure you have access to `llama-4-maverick` model

### Import Errors

If you see module import errors, try:

```bash
npm install groq-sdk dotenv
```

## Model Configuration

The module uses `llama-4-maverick` by default. You can override this by setting:

```env
LLM_MODEL=llama-4-maverick
```

## API Parameters

The module uses these default parameters:
- **Temperature**: 0.3 (for consistent scoring)
- **Max Tokens**: 500
- **Top P**: 1
- **Streaming**: false (non-streaming for our use case)

These can be adjusted in `culturalFitEvaluator.ts` if needed.

