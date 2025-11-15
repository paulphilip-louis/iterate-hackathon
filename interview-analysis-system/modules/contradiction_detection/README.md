# Contradiction Detection Module

A standalone subsystem for detecting contradictions in candidate interview transcripts.

## Overview

The Contradiction Detection module analyzes candidate speech to identify inconsistencies in their statements, such as:
- Years of experience contradictions
- Job title/company inconsistencies
- Education/degree contradictions
- Technical skill claims vs. actual experience
- Soft claims inconsistencies

## Architecture

```
contradiction_detection/
├── index.ts                    # Public API exports
├── types.ts                    # TypeScript interfaces
├── localScan.ts                # Local contradiction scan (every 10s)
├── profileExtraction.ts         # Profile extraction (every 60-120s)
├── profileConsistencyCheck.ts   # Compare profiles for contradictions
├── scoring.ts                  # Score computation and smoothing
├── prompt_local.ts             # LLM prompt for local scan
├── prompt_profile.ts           # LLM prompt for profile extraction
└── README.md                   # This file
```

## How It Works

### 1. Local Contradiction Scan (Every ~10 seconds)

Compares the latest transcript chunk with recent context (last 2 minutes) to detect immediate contradictions.

```typescript
import { localContradictionScan } from './contradiction_detection';

const contradictions = await localContradictionScan({
  latest_chunk: "I have 5 years of experience...",
  recent_context: "Previously mentioned 2 years...",
  previous_score: 80
});
```

### 2. Profile Extraction (Every 60-120 seconds)

Extracts structured facts from the last 5 minutes of transcript and compares with previously stored facts.

```typescript
import { extractProfileFacts } from './contradiction_detection';
import { getFacts } from '../fact_store';

const previousFacts = getFacts();
const result = await extractProfileFacts({
  transcript_summary: "Last 5 minutes of conversation...",
  previous_facts: previousFacts
});

// result.facts contains extracted facts
// result.contradictions contains detected contradictions
```

### 3. Profile Consistency Check

Intelligently compares new facts with existing facts using OpenAI GPT-4o to detect contradictions. The LLM understands context (e.g., "Frontend Engineer" vs "Full Stack Engineer" is NOT a contradiction - it's career progression).

```typescript
import { compareProfiles } from './contradiction_detection';

const contradictions = await compareProfiles(oldFacts, newFacts);
```

### 4. Contradiction Scoring

Maintains a score (0-100) where higher = more consistent.

```typescript
import { computeContradictionOutput } from './contradiction_detection';

const output = computeContradictionOutput(previousScore, contradictions);
// output.contradiction_score: 0-100
// output.trend: "+3" | "-5"
// output.label: "Consistent" | "Some Inconsistencies" | "High Risk" | "Severely Contradictory"
```

## Scoring Logic

### Severity Levels

- **minor**: -2 points (small inconsistency, might be clarification)
- **medium**: -5 points (clear contradiction in details)
- **major**: -10 points (significant contradiction)
- **red_flag**: -20 points (severe contradiction suggesting dishonesty)

### Smoothing Formula

```
new_score = previous_score * 0.7 + (previous_score + delta) * 0.3
```

### Labels

- **≥75**: "Consistent"
- **50-74**: "Some Inconsistencies"
- **25-49**: "High Risk"
- **<25**: "Severely Contradictory"

## Output Format

```typescript
{
  "contradiction_score": 75,
  "trend": "-5",
  "contradictions": [
    {
      "msg": "Years of experience contradiction: previously stated 5 years, now stating 2 years",
      "severity": "major",
      "field": "years_experience"
    }
  ],
  "label": "Some Inconsistencies"
}
```

## Integration with Fact Store

The module integrates with the `fact_store` module to:
- Store extracted profile facts
- Compare new facts with stored facts
- Detect contradictions over time

## Usage Example

```typescript
import { localContradictionScan, extractProfileFacts, computeContradictionOutput } from './contradiction_detection';
import { getFacts, updateFacts, mergeFacts } from '../fact_store';

// Local scan (every 10s)
const localContradictions = await localContradictionScan({
  latest_chunk: currentChunk,
  recent_context: last2Minutes,
  previous_score: currentScore
});

// Profile extraction (every 60-120s)
const profileResult = await extractProfileFacts({
  transcript_summary: last5Minutes,
  previous_facts: getFacts()
});

// Merge and store facts
const mergeResult = mergeFacts(getFacts(), profileResult.facts);
updateFacts(mergeResult.merged_facts);

// Combine all contradictions
const allContradictions = [
  ...localContradictions,
  ...profileResult.contradictions,
  ...mergeResult.conflicts.map(c => ({
    msg: `Conflict in ${c.field}: ${c.old_value} vs ${c.new_value}`,
    severity: 'medium' as const,
    field: c.field
  }))
];

// Compute output
const output = computeContradictionOutput(currentScore, allContradictions);
```

## Environment Variables

- `OPENAI_API_KEY`: API key for OpenAI
- `LLM_MODEL`: Model to use (default: `gpt-4o`)

## Future Enhancements

- More sophisticated contradiction detection algorithms
- Confidence scoring for contradictions
- Temporal analysis (contradictions over time)
- Integration with cultural fit module

