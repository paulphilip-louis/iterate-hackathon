/**
 * LLM Classifier
 * 
 * Classifies transcript chunks into script sections and subsections using LLM.
 * Supports OpenAI, Groq, and OpenRouter APIs.
 */

import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { ClassificationResult, LLMClassificationResponse } from './types';
import { INTERVIEW_SCRIPT } from './interviewScript';

// Load .env file from multiple possible locations
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..', '..');

// Try multiple .env locations
config({ path: join(projectRoot, '.env') });
config({ path: join(projectRoot, 'Modules', '.env') });
config({ path: join(projectRoot, 'modules', '.env') });
config({ path: join(projectRoot, 'script_tracking', '.env') });
config({ path: join(__dirname, '.env') });

/**
 * Build the system prompt for classification
 */
function buildClassificationPrompt(): string {
  const scriptDescription = INTERVIEW_SCRIPT.map(section => {
    const subsections = section.subsections
      .map(sub => `    ${sub.id} - ${sub.label}`)
      .join('\n');
    return `SECTION ${section.id} — ${section.name}\n${subsections}`;
  }).join('\n\n');

  return `You are an expert in job interview analysis. Your task is to classify each transcript chunk into the correct section and subsection of the interview script.

REFERENCE INTERVIEW SCRIPT:

${scriptDescription}

INSTRUCTIONS:
1. Analyze the provided transcript chunk
2. Identify the section (1-6) and subsection (format "X.Y") that best matches the content
3. If the topic is completely off-script, mark isOffScript: true
4. Provide a confidence score between 0 and 1
5. Indicate if this is a deviation from the expected flow
6. Give a clear reason for your classification

EXPECTED RESPONSE (strict JSON):
{
  "section": 1-6 or null,
  "subsection": "X.Y" or null,
  "confidence": 0.0-1.0,
  "deviation": true/false,
  "isOffScript": true/false,
  "reason": "clear explanation in English"
}`;
}

/**
 * Call LLM for classification
 * Supports OpenAI, Groq, and OpenRouter
 */
async function callLLMForClassification(chunk: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY || process.env.GROQ_API_KEY || process.env.OPENROUTER_API_KEY;
  const provider = process.env.LLM_PROVIDER || 'openai'; // 'openai', 'groq', 'openrouter'
  const model = process.env.LLM_MODEL || 'gpt-4o';

  if (!apiKey) {
    throw new Error('No API key found. Set OPENAI_API_KEY, GROQ_API_KEY, or OPENROUTER_API_KEY');
  }

  const systemPrompt = buildClassificationPrompt();
  const userMessage = `Analyze this transcript chunk and classify it into the interview script:\n\n"${chunk}"`;

  try {
    let apiUrl: string;
    let headers: Record<string, string>;
    let body: Record<string, any>;

    if (provider === 'groq') {
      apiUrl = 'https://api.groq.com/openai/v1/chat/completions';
      headers = {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      };
      body = {
        model: model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage }
        ],
        temperature: 0.1,
        max_tokens: 300,
        response_format: { type: 'json_object' }
      };
    } else if (provider === 'openrouter') {
      apiUrl = 'https://openrouter.ai/api/v1/chat/completions';
      headers = {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.OPENROUTER_REFERER || 'https://localhost',
        'X-Title': 'Interview Script Tracker'
      };
      body = {
        model: model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage }
        ],
        temperature: 0.1,
        max_tokens: 300,
        response_format: { type: 'json_object' }
      };
    } else {
      // Default: OpenAI
      apiUrl = 'https://api.openai.com/v1/chat/completions';
      headers = {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      };
      body = {
        model: model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage }
        ],
        temperature: 0.1,
        max_tokens: 300,
        response_format: { type: 'json_object' }
      };
    }

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`${provider} API error response:`, errorText);
      throw new Error(`${provider} API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const choice = data.choices?.[0];

    if (!choice?.message?.content) {
      throw new Error(`${provider} API returned empty content`);
    }

    return choice.message.content.trim();
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`${provider} API error: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Parse LLM response for classification
 */
function parseLLMResponse(response: string): LLMClassificationResponse {
  let cleaned = response.trim();

  // Remove markdown code blocks if present
  if (cleaned.includes('```json')) {
    const jsonBlock = cleaned.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonBlock && jsonBlock[1]) {
      cleaned = jsonBlock[1].trim();
    }
  } else if (cleaned.includes('```')) {
    const codeBlock = cleaned.match(/```\s*([\s\S]*?)\s*```/);
    if (codeBlock && codeBlock[1]) {
      cleaned = codeBlock[1].trim();
    }
  }

  // Try to extract JSON from response
  // Look for the last JSON object in the response (for thinking models)
  const lastBrace = cleaned.lastIndexOf('}');
  if (lastBrace > 0) {
    let braceCount = 1;
    let startIdx = lastBrace - 1;
    while (startIdx >= 0 && braceCount > 0) {
      if (cleaned[startIdx] === '}') braceCount++;
      if (cleaned[startIdx] === '{') braceCount--;
      if (braceCount === 0) break;
      startIdx--;
    }
    if (startIdx >= 0 && braceCount === 0) {
      const jsonCandidate = cleaned.substring(startIdx, lastBrace + 1);
      try {
        const parsed = JSON.parse(jsonCandidate);
        if (parsed.section !== undefined || parsed.isOffScript !== undefined) {
          return parsed as LLMClassificationResponse;
        }
      } catch (e) {
        // Continue to try other methods
      }
    }
  }

  // Try direct JSON parse
  try {
    return JSON.parse(cleaned) as LLMClassificationResponse;
  } catch (error) {
    // Try to extract JSON object containing classification fields
    const sectionPattern = /"section"\s*:/;
    const sectionIndex = cleaned.lastIndexOf('"section"');
    
    if (sectionIndex >= 0) {
      let jsonStart = cleaned.lastIndexOf('{', sectionIndex);
      if (jsonStart < 0) {
        jsonStart = cleaned.substring(0, sectionIndex).lastIndexOf('{');
      }
      
      if (jsonStart >= 0) {
        let braceCount = 1;
        let jsonEnd = jsonStart + 1;
        while (jsonEnd < cleaned.length && braceCount > 0) {
          if (cleaned[jsonEnd] === '{') braceCount++;
          if (cleaned[jsonEnd] === '}') braceCount--;
          if (braceCount === 0) break;
          jsonEnd++;
        }
        
        if (braceCount === 0) {
          const jsonCandidate = cleaned.substring(jsonStart, jsonEnd + 1);
          try {
            const parsed = JSON.parse(jsonCandidate);
            if (parsed.section !== undefined || parsed.isOffScript !== undefined) {
              return parsed as LLMClassificationResponse;
            }
          } catch (e) {
            // Continue
          }
        }
      }
    }

    // Last resort: try simple JSON pattern
    const jsonPattern = /\{[\s\S]*?"section"[\s\S]*?\}/;
    const matches = cleaned.match(jsonPattern);
    if (matches && matches[0]) {
      try {
        return JSON.parse(matches[0]) as LLMClassificationResponse;
      } catch (e) {
        // Fall through to error
      }
    }

    throw new Error(`No valid JSON found in LLM response. First 200 chars: ${cleaned.substring(0, 200)}`);
  }
}

/**
 * Validate and normalize classification result
 */
function validateClassificationResult(result: LLMClassificationResponse): ClassificationResult {
  // Validate section
  let section: number | null = result.section ?? null;
  if (section !== null) {
    if (typeof section !== 'number' || section < 1 || section > 6) {
      section = null;
    }
  }

  // Validate subsection
  let subsection: string | null = result.subsection ?? null;
  if (subsection !== null) {
    if (typeof subsection !== 'string') {
      subsection = null;
    } else {
      // Validate format (e.g., "1.1", "2.3")
      const subsectionPattern = /^\d+\.\d+$/;
      if (!subsectionPattern.test(subsection)) {
        subsection = null;
      } else {
        // Validate that subsection belongs to the section
        const [sectionNum] = subsection.split('.').map(Number);
        if (section !== null && sectionNum !== section) {
          // Mismatch: use section to infer subsection or null
          subsection = null;
        }
      }
    }
  }

  // Validate confidence
  let confidence = result.confidence ?? 0.5;
  if (typeof confidence !== 'number' || confidence < 0 || confidence > 1) {
    confidence = 0.5;
  }

  // Validate boolean fields
  const deviation = result.deviation ?? false;
  const isOffScript = result.isOffScript ?? false;

  // Validate reason
  const reason = result.reason ?? 'Classification completed';

  return {
    section,
    subsection,
    confidence,
    deviation: Boolean(deviation),
    isOffScript: Boolean(isOffScript),
    reason: String(reason)
  };
}

/**
 * Classify a transcript chunk into script section/subsection
 * 
 * @param chunk - Transcript chunk to classify
 * @returns Classification result
 */
export async function classifyChunk(chunk: string): Promise<ClassificationResult> {
  if (!chunk || chunk.trim().length === 0) {
    return {
      section: null,
      subsection: null,
      confidence: 0,
      deviation: false,
      isOffScript: false,
      reason: 'Empty or invalid chunk'
    };
  }

  try {
    // Limit chunk size to avoid token limits
    const limitedChunk = chunk.substring(0, 500);
    
    const rawResponse = await callLLMForClassification(limitedChunk);
    const parsed = parseLLMResponse(rawResponse);
    const validated = validateClassificationResult(parsed);
    
    return validated;
  } catch (error) {
    console.error('Error in LLM classification:', error);
    
    // Return safe fallback
    return {
      section: null,
      subsection: null,
      confidence: 0,
      deviation: false,
      isOffScript: false,
      reason: `Classification error: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

