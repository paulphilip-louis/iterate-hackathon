# Quick Start - Testing the Cultural Fit Module

## Run Tests (Easiest Way)

```bash
npm run test:cultural-fit
```

This runs 6 comprehensive test cases with mock LLM responses, demonstrating:
- ✅ Negative signal detection (blame shifting)
- ✅ Positive signal detection (ownership, accountability)
- ✅ Red flag detection (toxic behavior)
- ✅ Score smoothing verification
- ✅ Example input handling
- ✅ Edge case validation

## What You'll See

The tests will output:
- Input data for each test case
- Mock LLM responses
- Final results after smoothing
- Verification messages

Example output:
```
🧪 Test 1: Blame Shifting (Negative Signal)
────────────────────────────────────────────────────────────
Input: { ... }
Result: {
  "cultural_score": 54,
  "trend": "-4",
  "signals": [...],
  "label": "Moderate Fit"
}
✅ Test passed!
```

## Test Individual Cases

You can also import and run individual test functions:

```typescript
import { testBlameShifting, testPositiveSignals } from './cultural_fit/test';

await testBlameShifting();
await testPositiveSignals();
```

## Next Steps

1. **Review the test output** to understand how the module works
2. **Check `TESTING.md`** for detailed testing documentation
3. **Implement real LLM** in `culturalFitEvaluator.ts` when ready
4. **Integrate with your transcript system** using the examples in `README.md`

## Troubleshooting

- **"Cannot find module 'tsx'"**: The script uses `npx tsx` which auto-installs it
- **TypeScript errors**: Make sure you're in the project root directory
- **All tests pass**: ✅ Your module is working correctly!

