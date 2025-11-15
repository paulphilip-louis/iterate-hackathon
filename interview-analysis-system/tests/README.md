# Cultural Fit Detection - Test Environment

This test environment simulates the Cultural Misfit Detection module before connecting real Speech-to-Text (STT) and diarization systems.

## 📁 Structure

```
/tests/
├── fakeTranscript.ts           # Simulated interview transcript with mixed signals
├── diarizationSimulator.ts     # Simulates speaker diarization and chunking
├── culturalFitTestRunner.ts    # Main test harness that processes chunks
├── runTest.sh                  # Bash script to run the simulation
└── README.md                   # This file
```

## 🎯 What This Test Setup Does

This test environment simulates a complete interview evaluation pipeline:

1. **Fake Transcript** (`fakeTranscript.ts`)
   - Contains realistic interview dialogue
   - Includes positive signals (ownership, accountability, curiosity)
   - Includes negative signals (blame-shifting, excuses, arrogance)
   - Contains contradictions and inconsistencies
   - ~12 candidate utterances total

2. **Diarization Simulator** (`diarizationSimulator.ts`)
   - Filters out recruiter/interviewer speech
   - Extracts only candidate utterances
   - Groups speech into chunks (simulating 10-20 second segments)
   - Returns candidate-only speech chunks

3. **Test Runner** (`culturalFitTestRunner.ts`)
   - Processes chunks sequentially with 1-second delays (simulating real-time)
   - Calls `evaluateCulturalFit()` for each chunk
   - Maintains score history and conversation context
   - Logs detailed results for each evaluation
   - Shows score trajectory over time

## 🚀 How to Run

### Option 1: Using the Bash Script (Recommended)

```bash
# Make the script executable
chmod +x tests/runTest.sh

# Run the test
./tests/runTest.sh
```

### Option 2: Direct Execution

```bash
npx tsx tests/culturalFitTestRunner.ts
```

### Option 3: Using npm script (if added to package.json)

```bash
npm run test:simulation
```

## 📊 What to Expect in the Logs

The test runner will output:

```
🚀 Starting Cultural Fit Detection Simulation
======================================================================

📊 Processing 12 candidate speech chunks
🎯 Starting score: 🟡 50

──────────────────────────────────────────────────────────────────────

📝 CHUNK 1/12
💬 Text: "Sure! I have about 5 years of experience..."

⏳ Waiting 1 second (simulating real-time processing)...
🤖 Calling evaluateCulturalFit()...

📊 RESULTS:
  Previous Score: 🟡 50
  New Score: 🟡 52
  Trend: 📈 +2
  Label: Moderate Fit
  Processing Time: 623ms

🔍 SIGNALS DETECTED:
  ✅ [POSITIVE] Ownership: demonstrates experience and confidence

──────────────────────────────────────────────────────────────────────

[... continues for all chunks ...]

📈 FINAL SUMMARY
======================================================================
🎯 Final Cultural Fit Score: 🟡 45
📊 Label: Low Fit
📝 Total Chunks Processed: 12

📉 Score Trajectory:
   Started at: 50 (neutral)
   Ended at: 45
   Net Change: 📉 -5

⚠️  Result: LOW FIT - Significant cultural misalignment

✨ Simulation complete!
```

## 🔍 How Fake Diarization Works

The diarization simulator:

1. **Filters Speaker Segments**: Extracts only `speaker: "candidate"` entries from the transcript
2. **Chunks Speech**: Treats each candidate utterance as a separate chunk (simulating 10-20 second segments)
3. **Returns Array**: Provides an array of candidate-only speech strings

In a real system, diarization would:
- Analyze audio to identify speaker segments
- Use voice recognition to distinguish between speakers
- Group speech into time-based chunks (e.g., 10-20 seconds)
- Filter out non-candidate speech

The simulator mimics this by:
- Using pre-labeled transcript entries
- Filtering by speaker field
- Returning chunks ready for cultural fit evaluation

## 🔌 How to Plug STT Later

When you're ready to connect real STT and diarization:

### Step 1: Replace Fake Transcript

Instead of `fakeTranscript.ts`, use your STT output:

```typescript
// Instead of:
import { getSimulatedCandidateChunks } from './diarizationSimulator';

// Use:
import { getRealTimeChunks } from './yourSTTModule';
```

### Step 2: Replace Diarization Simulator

Replace `diarizationSimulator.ts` with your real diarization:

```typescript
// Real diarization would:
// 1. Receive audio segments from STT
// 2. Identify speaker (candidate vs interviewer)
// 3. Filter candidate speech
// 4. Group into chunks
export function getRealCandidateChunks(): string[] {
  // Your real diarization logic here
  return candidateChunks;
}
```

### Step 3: Update Test Runner

Modify `culturalFitTestRunner.ts` to:
- Remove artificial 1-second delays (use real-time chunk arrival)
- Handle streaming chunks instead of pre-loaded array
- Add error handling for STT/diarization failures

```typescript
// Instead of:
for (const chunk of chunks) {
  await sleep(1000); // Remove this
  // ...
}

// Use:
stream.on('chunk', async (chunk) => {
  // Process chunk as it arrives
  await evaluateCulturalFit({...});
});
```

### Step 4: Integration Points

The test runner already uses the same `evaluateCulturalFit()` function that will work with real STT:

```typescript
const result = await evaluateCulturalFit({
  latest_chunk: chunk,           // From STT
  history_summary: history,      // Maintained over time
  previous_score: score           // Updated after each chunk
});
```

No changes needed to the core `cultural_fit/` module!

## 🧪 Test Scenarios Included

The fake transcript includes:

### Positive Signals
- ✅ Ownership and responsibility
- ✅ Accountability and learning from mistakes
- ✅ Curiosity and growth mindset
- ✅ Teamwork and collaboration
- ✅ Communication clarity

### Negative Signals
- ❌ Blame-shifting
- ❌ Excuses and avoidance
- ❌ Arrogance
- ❌ Vagueness
- ❌ Toxic attitude
- ❌ Contradictions (years of experience)

### Mixed Signals
- Some chunks show positive traits
- Some chunks show negative traits
- Realistic interview flow with ups and downs

## 📈 Understanding the Output

### Score Indicators
- 🟢 **Green (75-100)**: High Fit
- 🟡 **Yellow (50-74)**: Moderate Fit
- 🟠 **Orange (25-49)**: Low Fit
- 🔴 **Red (0-24)**: At Risk

### Trend Indicators
- 📈 **Upward**: Score improving
- 📉 **Downward**: Score declining
- ➡️ **Stable**: No significant change

### Signal Types
- ✅ **Positive**: Good cultural fit indicators
- ❌ **Negative**: Cultural misalignment indicators

## 🔧 Customization

### Adjust Chunk Size

Edit `diarizationSimulator.ts`:

```typescript
// Use time-based chunking instead of per-utterance
const chunks = getTimeBasedChunks(50); // 50 words per chunk
```

### Add More Test Scenarios

Edit `fakeTranscript.ts` to add more interview scenarios:

```typescript
export const fakeTranscript: TranscriptEntry[] = [
  // Add your scenarios here
  {
    speaker: 'candidate',
    text: 'Your test scenario text here'
  }
];
```

### Change Processing Delay

Edit `culturalFitTestRunner.ts`:

```typescript
await sleep(2000); // 2 seconds instead of 1
```

## 🐛 Troubleshooting

### Error: "Cannot find module"
- Make sure you're running from the project root
- Run `npm install` to ensure dependencies are installed

### Error: "GROQ_API_KEY not found"
- The test uses real API calls by default
- Make sure `cultural_fit/.env` contains your `GROQ_API_KEY`
- Or modify the test to use mock LLM responses

### Test takes too long
- Reduce the `sleep()` delay in `culturalFitTestRunner.ts`
- Or use mock LLM instead of real API calls

## 📝 Next Steps

1. ✅ **Run the simulation** to see how it works
2. 🔄 **Customize the transcript** with your own scenarios
3. 🔌 **Integrate real STT** when ready
4. 📊 **Monitor results** in production

## 🎓 Learning from the Simulation

This test environment helps you:
- Understand how cultural fit scores evolve over time
- See how different signals affect the score
- Test the smoothing algorithm
- Validate the evaluation logic
- Prepare for real-world integration

---

**Ready to test?** Run `./tests/runTest.sh` and watch the cultural fit evaluation in action! 🚀

