# Company Values Configuration Guide

This guide explains how to configure company culture values for the Cultural Fit Detection module.

## Overview

The module now supports **configurable company culture values** that are used to evaluate candidate alignment. You can provide company values via a text file, and the system will automatically parse and use them in the evaluation.

## How It Works

1. **Text File Input**: Create a `.txt` file with your company values
2. **Automatic Parsing**: The system parses the file and extracts:
   - Company name
   - Core values
   - Positive behaviors
   - Negative behaviors to avoid
3. **Dynamic Prompt**: The LLM prompt is customized with your company values
4. **Enhanced Evaluation**: Candidates are evaluated against your specific values

## File Format

Create a text file with your company values. The parser supports flexible formats:

### Example Format 1: Numbered List

```
Company Name - Company Values

CORE VALUES:
1. Ownership - We take full responsibility for our work
2. Accountability - We are transparent about our work
3. Curiosity - We ask questions and continuously learn

WHAT WE VALUE:
- Proactive problem-solving
- Learning from mistakes

WHAT WE AVOID:
- Blame-shifting
- Making excuses
```

### Example Format 2: Bullet Points

```
My Company - Core Values

CORE VALUES:
- Ownership: Taking responsibility for outcomes
- Accountability: Being transparent and honest
- Teamwork: Collaborating effectively

WHAT WE VALUE:
* Clear communication
* Growth mindset

WHAT WE AVOID:
* Toxic behavior
* Arrogance
```

### Example Format 3: Simple List

```
Company Values

Ownership
Accountability
Curiosity
Teamwork
Humility
```

## Using Company Values

### Option 1: File Path (Recommended)

Pass the path to your company values file:

```typescript
import { evaluateCulturalFit } from './cultural_fit';

const result = await evaluateCulturalFit({
  latest_chunk: "I take full responsibility for the mistake...",
  previous_score: 50,
  company_values_file_path: './path/to/company_values.txt'
});
```

### Option 2: Direct Object

Pass company values as an object:

```typescript
import { evaluateCulturalFit } from './cultural_fit';

const result = await evaluateCulturalFit({
  latest_chunk: "I take full responsibility for the mistake...",
  previous_score: 50,
  company_values: {
    company_name: "My Company",
    core_values: [
      "Ownership",
      "Accountability",
      "Curiosity"
    ],
    positive_values: [
      "Proactive problem-solving",
      "Learning from mistakes"
    ],
    negative_values: [
      "Blame-shifting",
      "Making excuses"
    ]
  }
});
```

## Mock Data

A mock company values file is included for testing:

**Location:** `cultural_fit/mock_company_values.txt`

This file contains example values for "Iterate" company and is used in the test suite.

## Parser Features

The parser automatically:

- ✅ Extracts company name from headers
- ✅ Parses numbered lists (1. Value, 2. Value)
- ✅ Parses bullet points (- Value, * Value)
- ✅ Detects section headers (CORE VALUES, WHAT WE VALUE, etc.)
- ✅ Handles various formats and separators
- ✅ Falls back gracefully if format is unclear

## Integration in Tests

The test runner (`tests/culturalFitTestRunner.ts`) automatically uses the mock company values:

```typescript
const companyValuesPath = join(__dirname, '..', 'cultural_fit', 'mock_company_values.txt');

const input: CulturalFitInput = {
  latest_chunk: chunk,
  previous_score: score,
  company_values_file_path: companyValuesPath  // Uses mock values
};
```

## Customization

### For Different Companies

Simply create a new `.txt` file with that company's values:

```typescript
// Company A
await evaluateCulturalFit({
  ...,
  company_values_file_path: './company_a_values.txt'
});

// Company B
await evaluateCulturalFit({
  ...,
  company_values_file_path: './company_b_values.txt'
});
```

### For Different Roles

You can create role-specific value files:

- `engineering_values.txt`
- `sales_values.txt`
- `management_values.txt`

## How It Affects Evaluation

When company values are provided:

1. **Enhanced Prompt**: The LLM receives your specific values in the system prompt
2. **Value Alignment**: Candidates are evaluated against your core values
3. **Weighted Scoring**: Alignment with company values gets higher weight
4. **Specific Signals**: Signals mention which company values are aligned/misaligned

### Example Output

With company values, signals will be more specific:

```json
{
  "signals": [
    {
      "type": "positive",
      "msg": "Ownership: Demonstrates strong alignment with company value of taking responsibility"
    },
    {
      "type": "negative",
      "msg": "Values Mismatch: Shows behavior that conflicts with company value of Accountability"
    }
  ]
}
```

## Best Practices

1. **Be Specific**: Include clear descriptions of what each value means
2. **Include Examples**: Add "WHAT WE VALUE" and "WHAT WE AVOID" sections
3. **Keep It Updated**: Update values as your company culture evolves
4. **Test First**: Use the mock file format as a template
5. **Version Control**: Keep company values files in version control

## Troubleshooting

### Parser Not Extracting Values

- Check file format matches examples above
- Ensure section headers are clear (CORE VALUES, etc.)
- Use numbered lists or bullet points
- Check file encoding (should be UTF-8)

### Values Not Appearing in Evaluation

- Verify file path is correct
- Check file is readable
- Ensure `company_values_file_path` is set in input
- Check console for parsing errors

### Custom Format Not Working

The parser is flexible but if you have a unique format, you can:
1. Pre-parse your file into the `CompanyCultureValues` object
2. Pass it directly via `company_values` parameter
3. Modify `companyValuesParser.ts` to support your format

## API Reference

### Types

```typescript
interface CompanyCultureValues {
  company_name?: string;
  core_values: string[];
  positive_values?: string[];
  negative_values?: string[];
  raw_text?: string;
}

interface CulturalFitInput {
  latest_chunk: string;
  history_summary?: string;
  previous_score: number;
  company_values_file_path?: string;  // Path to .txt file
  company_values?: CompanyCultureValues;  // Direct object
}
```

### Functions

```typescript
// Parse from text content
parseCompanyValues(textContent: string): CompanyCultureValues

// Load from file
loadCompanyValuesFromFile(filePath: string): CompanyCultureValues

// Get from input (handles both file path and direct object)
getCompanyValues(input: CulturalFitInput): CompanyCultureValues | null
```

---

**Ready to use?** Create your company values file and pass it to `evaluateCulturalFit()`! 🚀

