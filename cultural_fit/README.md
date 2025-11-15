# Cultural Fit Detection Module

A standalone TypeScript module for evaluating cultural fit from interview transcripts. This module analyzes candidate speech in real-time and maintains a dynamic cultural fit score with positive and negative signals.

## Overview

The Cultural Fit Detection module processes transcript chunks from candidate speech and evaluates them against predefined cultural dimensions. It uses an LLM (Llama 4 Maverick, Kimi K2, or GPT-4.1-mini) to extract signals and compute scores, then applies exponential smoothing to maintain a stable score over time.

## Architecture

```
cultural_fit/
├── index.ts                    # Public API exports
├── types.ts                    # TypeScript interfaces
├── culturalFitPrompt.ts        # LLM system prompt
├── culturalFitEvaluator.ts     # Main evaluation logic
├── scoringLogic.ts             # Score computation and smoothing
├── exampleInput.json           # Sample input data
└── README.md                   # This file
```

## How It Works

### 1. Input Processing
The module accepts:
- `latest_chunk`: The most recent transcript chunk from the candidate
- `history_summary`: Optional summary of previous conversation context
- `previous_score`: The previous cultural fit score (0-100)

### 2. LLM Evaluation
The LLM analyzes the transcript chunk for:
- **Positive signals** (+1 to +5 each): ownership, accountability, curiosity, teamwork, humility, communication clarity, growth mindset, transparency
- **Negative signals** (-1 to -8 each): blame shifting, arrogance, avoidance, vagueness, contradiction, lack of curiosity, toxic attitude, excuses, values mismatch
- **Red flags** (-10): severe indicators like hostile behavior or complete refusal of responsibility

### 3. Score Smoothing
The raw LLM score is smoothed using exponential smoothing:
```
new_score = previous_score * 0.7 + instant_delta * 0.3
```
This ensures the score doesn't fluctuate wildly with each chunk while still responding to new information.

### 4. Label Assignment
Scores are categorized into labels:
- **≥75**: High Fit
- **50-74**: Moderate Fit
- **25-49**: Low Fit
- **<25**: At Risk

### 5. Output
Returns a structured JSON object with:
- `cultural_score`: Smoothed score (0-100)
- `trend`: Change indicator (e.g., "+3", "-2")
- `signals`: Array of detected positive/negative signals
- `label`: Human-readable category

## Usage

### Basic Example

```typescript
import { evaluateCulturalFit, CulturalFitInput } from './cultural_fit';

const input: CulturalFitInput = {
  latest_chunk: "I think mistakes happen but it was not my fault. My teammates didn't help me.",
  history_summary: "Candidate previously showed good communication but avoided responsibility twice.",
  previous_score: 58
};

const result = await evaluateCulturalFit(input);

console.log(result);
// {
//   cultural_score: 45,
//   trend: "-13",
//   signals: [
//     { type: "negative", msg: "Blame shifting: explicitly denies responsibility..." },
//     { type: "negative", msg: "Avoidance: pattern of avoiding responsibility..." }
//   ],
//   label: "Low Fit"
// }
```

### Streaming Integration

To integrate with a streaming transcript system:

```typescript
import { evaluateCulturalFit, CulturalFitInput, CulturalFitOutput } from './cultural_fit';

let currentScore = 50; // Initial score
let conversationHistory: string[] = [];

// For each new transcript chunk
async function processChunk(chunk: string): Promise<CulturalFitOutput> {
  const input: CulturalFitInput = {
    latest_chunk: chunk,
    history_summary: conversationHistory.slice(-3).join(' '), // Last 3 chunks
    previous_score: currentScore
  };
  
  const result = await evaluateCulturalFit(input);
  
  // Update state
  currentScore = result.cultural_score;
  conversationHistory.push(chunk);
  
  // Keep history manageable (e.g., last 10 chunks)
  if (conversationHistory.length > 10) {
    conversationHistory.shift();
  }
  
  return result;
}
```

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure LLM

Set the `LLM_MODEL` environment variable:

```bash
export LLM_MODEL="gpt-4.1-mini"  # or "kimi-k2" or "llama-4-maverick"
```

### 3. Implement LLM Call

Edit `culturalFitEvaluator.ts` and implement the `callLLM()` function with your chosen LLM provider:

**For OpenAI (GPT-4.1-mini):**
```typescript
import OpenAI from 'openai';

async function callLLM(config: LLMConfig): Promise<string> {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const response = await openai.chat.completions.create({
    model: config.model,
    messages: [
      { role: 'system', content: config.system },
      { role: 'user', content: config.user }
    ],
    temperature: config.temperature || 0.3,
    max_tokens: config.maxTokens || 500
  });
  return response.choices[0].message.content || '';
}
```

**For Kimi K2 or Llama 4 Maverick:**
Use their respective API clients with similar structure.

## Testing

### Run a Test Evaluation

```typescript
import { evaluateCulturalFit } from './cultural_fit';
import exampleInput from './exampleInput.json';

async function test() {
  try {
    const result = await evaluateCulturalFit(exampleInput);
    console.log('Cultural Fit Result:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Error:', error);
  }
}

test();
```

### Expected Output

```json
{
  "cultural_score": 45,
  "trend": "-13",
  "signals": [
    {
      "type": "negative",
      "msg": "Blame shifting: explicitly denies responsibility and blames teammates"
    },
    {
      "type": "negative",
      "msg": "Avoidance: pattern of avoiding responsibility (second occurrence)"
    }
  ],
  "label": "Low Fit"
}
```

## Integration with Streaming Transcript System

When integrating with a live interview system:

1. **Receive transcript chunks** from your STT (Speech-to-Text) pipeline
2. **Call `evaluateCulturalFit()`** for each chunk
3. **Maintain state** (previous score, conversation history)
4. **Aggregate results** over time to track cultural fit trends
5. **Trigger alerts** if score drops below threshold (e.g., <25 "At Risk")

### Example Integration Pattern

```typescript
class CulturalFitTracker {
  private score: number = 50;
  private history: string[] = [];
  
  async processTranscriptChunk(chunk: string): Promise<CulturalFitOutput> {
    const result = await evaluateCulturalFit({
      latest_chunk: chunk,
      history_summary: this.history.slice(-3).join(' '),
      previous_score: this.score
    });
    
    this.score = result.cultural_score;
    this.history.push(chunk);
    
    // Alert if at risk
    if (result.label === 'At Risk') {
      this.triggerAlert(result);
    }
    
    return result;
  }
  
  private triggerAlert(result: CulturalFitOutput) {
    // Implement alerting logic
    console.warn('Cultural fit at risk!', result);
  }
}
```

## Error Handling

The module includes robust error handling:
- **Malformed LLM responses**: Falls back to previous score with error signal
- **Invalid input**: Throws descriptive errors
- **JSON parsing errors**: Attempts to extract JSON from markdown-wrapped responses

## Customization

### Adjusting Score Ranges

Edit `scoringLogic.ts` to modify label thresholds:

```typescript
export function labelScore(score: number): string {
  if (score >= 80) return 'High Fit';      // Changed from 75
  // ... etc
}
```

### Modifying Smoothing Factor

Edit `scoringLogic.ts` to change the smoothing formula:

```typescript
export function computeNewScore(previous: number, delta: number): number {
  // More responsive: 60% previous, 40% new
  const smoothed = previous * 0.6 + delta * 0.4;
  return Math.max(0, Math.min(100, Math.round(smoothed)));
}
```

### Adding Custom Signals

Edit `culturalFitPrompt.ts` to add new positive/negative dimensions or signals.

## Notes

- This module is **standalone** and does not include STT, audio processing, or UI components
- The LLM call must be implemented based on your chosen provider
- Score smoothing ensures stability while remaining responsive to new information
- All signals are preserved in the output for transparency and debugging

## License

[Your License Here]

