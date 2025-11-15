# Testing Guide

This guide explains how to test the Cultural Fit Detection module.

## Quick Start

### Option 1: Using npm script (Recommended)

```bash
npm run test:cultural-fit
```

This will run all test cases with mock LLM responses.

### Option 2: Using tsx directly

```bash
npx tsx cultural_fit/test.ts
```

### Option 3: Using Node.js with ts-node

If you have `ts-node` installed:

```bash
npx ts-node --esm cultural_fit/test.ts
```

## What the Tests Cover

The test suite includes 6 test cases:

1. **Test 1: Blame Shifting** - Tests negative signal detection when candidate shifts blame
2. **Test 2: Positive Signals** - Tests positive signal detection (ownership, accountability)
3. **Test 3: Red Flag** - Tests detection of severe negative indicators
4. **Test 4: Score Smoothing** - Verifies the exponential smoothing formula works correctly
5. **Test 5: Example Input** - Tests with the provided example input JSON
6. **Test 6: Edge Cases** - Tests error handling for invalid inputs

## Understanding the Output

Each test will show:
- The input data
- The mock LLM response
- The final result after smoothing
- Verification of expected behavior

Example output:
```
🧪 Test 1: Blame Shifting (Negative Signal)
────────────────────────────────────────────────────────────
Input: {
  "latest_chunk": "I think mistakes happen but it was not my fault...",
  "previous_score": 58
}

Result: {
  "cultural_score": 45,
  "trend": "-13",
  "signals": [...],
  "label": "Low Fit"
}

✅ Test passed!
   Score dropped from 58 to 45
   Trend: -13
   Signals detected: 2
```

## Testing with Real LLM

Once you've implemented the real LLM call in `culturalFitEvaluator.ts`, you can test with a real API:

1. Set your API key:
   ```bash
   export OPENAI_API_KEY="your-key-here"
   export LLM_MODEL="gpt-4.1-mini"
   ```

2. Create a simple test script:

```typescript
import { evaluateCulturalFit } from './culturalFitEvaluator';
import { CulturalFitInput } from './types';

async function testWithRealLLM() {
  const input: CulturalFitInput = {
    latest_chunk: "I take full responsibility for the mistake and learned from it.",
    previous_score: 50
  };
  
  const result = await evaluateCulturalFit(input);
  console.log(JSON.stringify(result, null, 2));
}

testWithRealLLM();
```

3. Run it:
   ```bash
   npx tsx test-real-llm.ts
   ```

## Writing Your Own Tests

You can create custom tests by importing the test functions:

```typescript
import { evaluateCulturalFit, LLMCallFunction } from './culturalFitEvaluator';
import { CulturalFitInput } from './types';

// Create a mock LLM
const mockLLM: LLMCallFunction = async (config) => {
  return JSON.stringify({
    cultural_score: 70,
    trend: "+5",
    signals: [{ type: "positive", msg: "Test signal" }],
    label: "Moderate Fit"
  });
};

// Test with your input
const input: CulturalFitInput = {
  latest_chunk: "Your test transcript here",
  previous_score: 65
};

const result = await evaluateCulturalFit(input, mockLLM);
console.log(result);
```

## Troubleshooting

### Error: "Cannot find module 'tsx'"
Install tsx globally or use npx:
```bash
npm install -g tsx
# or
npx tsx cultural_fit/test.ts
```

### Error: "LLM call not implemented"
This is expected when testing without a real LLM. The test file uses mock LLM functions, so this error shouldn't occur. If it does, check that you're passing the mock function as the second parameter to `evaluateCulturalFit()`.

### TypeScript errors
Make sure you're using a TypeScript-compatible runner (tsx, ts-node, etc.) or compile first:
```bash
npx tsc cultural_fit/test.ts --module esnext --target es2020
node cultural_fit/test.js
```

