# Fact Store Module

A simple in-memory store for candidate profile facts extracted during interviews.

## Overview

The Fact Store maintains a structured representation of candidate profile information extracted from interview transcripts. It supports merging new facts with existing ones and detecting conflicts.

## Architecture

```
fact_store/
├── store.ts           # In-memory storage operations
├── mergeStrategy.ts   # Fact merging and conflict detection
├── summarizer.ts      # Text/JSON summarization for LLM context
├── types.ts           # TypeScript interfaces
└── index.ts           # Public API exports
```

## Usage

### Basic Operations

```typescript
import { getFacts, updateFacts, resetFacts } from './fact_store';

// Get current facts
const facts = getFacts();

// Update facts
updateFacts({
  years_experience: 5,
  job_titles: ['Senior Engineer'],
  companies: ['Tech Corp']
});

// Reset store
resetFacts();
```

### Merging Facts

```typescript
import { mergeFacts } from './fact_store';

const oldFacts = getFacts();
const newFacts = extractFromTranscript(transcript);

const result = mergeFacts(oldFacts, newFacts, {
  keep_conflicts: true,
  min_confidence: 0.6
});

// Update store with merged facts
updateFacts(result.merged_facts);

// Handle conflicts
if (result.conflicts.length > 0) {
  console.log('Conflicts detected:', result.conflicts);
}
```

### Summarization

```typescript
import { summarizeFacts, summarizeFactsJSON } from './fact_store';

const facts = getFacts();

// Text summary for LLM context
const textSummary = summarizeFacts(facts);
// "Experience: 5 years. Job titles: Senior Engineer. Companies: Tech Corp."

// JSON summary for structured comparison
const jsonSummary = summarizeFactsJSON(facts);
// '{"years_experience":5,"job_titles":["Senior Engineer"],...}'
```

## Fact Structure

Profile facts include:
- `years_experience`: Number or string
- `job_titles`: Array of job titles
- `companies`: Array of company names
- `degrees`: Array of degrees/education
- `leadership_experience`: Array of leadership roles
- `languages`: Array of programming languages
- `tech_stack`: Array of technologies
- `salary_expectations`: Number or string
- `other_facts`: Additional key-value pairs

## Merge Strategy

The merge strategy uses confidence-based replacement:
- Higher confidence facts replace lower confidence ones
- Conflicts are flagged and optionally stored
- Arrays are merged (deduplicated)
- Timestamps track when facts were extracted

## Future Enhancements

- Persistent storage (database)
- Fact versioning
- Confidence decay over time
- More sophisticated conflict resolution

