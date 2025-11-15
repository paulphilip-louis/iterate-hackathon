# Contradiction Detection Test Suite

Test harness for the Contradiction Detection module.

## Overview

This test suite simulates real-time contradiction detection during an interview:
- Processes candidate speech chunks sequentially
- Runs local contradiction scan on every chunk
- Runs profile extraction every 6 chunks
- Maintains and updates contradiction score dynamically

## Files

- `fakeTranscript.ts` - Generates realistic interview transcript with contradictions
- `diarizationSimulator.ts` - Filters candidate-only utterances and groups into chunks
- `contradictionTestRunner.ts` - Main test harness
- `runTest.sh` - Script to execute tests

## Running Tests

### Prerequisites

- Node.js installed
- `GROQ_API_KEY` set in `.env` file (in project root or `cultural_fit/.env`)

### Execute Tests

```bash
# Make script executable
chmod +x tests/contradiction_detection/runTest.sh

# Run tests
./tests/contradiction_detection/runTest.sh
```

Or directly:

```bash
npx tsx tests/contradiction_detection/contradictionTestRunner.ts
```

## What to Expect

The test runner will:
1. Process 12 candidate speech chunks
2. Run local scan on each chunk (comparing with recent context)
3. Run profile extraction every 6 chunks
4. Display detected contradictions with severity levels
5. Update contradiction score dynamically
6. Show final extracted facts and score

### Expected Output

```
🚀 Starting Contradiction Detection Simulation
======================================================================

📊 Processing 12 candidate speech chunks
🎯 Starting score: 🟢 100
📋 Profile extraction will run every 6 chunks

──────────────────────────────────────────────────────────────────────

📝 CHUNK 1/12
💬 Text: "Sure! I have about 5 years of experience..."

🔍 Running local contradiction scan...
⏱️  Local scan took 1234ms
✅ No local contradictions detected

📊 No contradictions detected - score maintained

──────────────────────────────────────────────────────────────────────
...
```

## Test Scenarios

The fake transcript includes:
- **Contradiction in years of experience**: Claims 5 years, then clarifies to 2 years
- **Blame shifting**: Blames teammates for project failures
- **Arrogance**: Dismisses code reviews and claims no weaknesses
- **Avoidance**: Evades questions about current role

## Integration with Fact Store

The test demonstrates:
- Fact extraction from transcript
- Fact merging with conflict detection
- Profile consistency checking
- Score computation with smoothing

## Future Enhancements

- More sophisticated test scenarios
- Performance benchmarking
- Edge case testing
- Integration tests with cultural fit module

