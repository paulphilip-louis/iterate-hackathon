/**
 * Profile extraction implementation
 * 
 * Extracts structured facts from transcript summary (last 5 minutes)
 * and detects contradictions with previous facts.
 */

import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { ProfileExtractionInput, ProfileFacts, LLMProfileExtractionResponse } from './types';
import { buildProfileExtractionPrompt } from './prompt_profile';
import { summarizeFactsJSON } from '../fact_store/summarizer';

// Load .env file from multiple possible locations
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..', '..');

// Try multiple .env locations
config({ path: join(projectRoot, '.env') }); // Project root
config({ path: join(projectRoot, 'Modules', '.env') }); // /Modules/.env
config({ path: join(projectRoot, 'modules', '.env') }); // /modules/.env
config({ path: join(projectRoot, 'cultural_fit', '.env') }); // cultural_fit/.env
config({ path: join(projectRoot, 'modules', 'cultural_fit', '.env') }); // modules/cultural_fit/.env

/**
 * Call LLM for profile extraction using Anthropic
 */
async function callLLMForProfileExtraction(systemPrompt: string, userMessage: string): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    throw new Error('GROQ_API_KEY not found in environment variables');
  }

  // Force Groq model, ignore LLM_MODEL env var
  const model = 'meta-llama/llama-4-maverick-17b-128e-instruct';
  
  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage }
        ],
        temperature: 0.1,
        max_tokens: 300,
        response_format: { type: 'json_object' }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Groq API error response:', errorText);
      throw new Error(`Groq API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();

    const choice = data.choices?.[0];
    if (!choice?.message?.content) {
      throw new Error('Groq API returned empty content');
    }

    return choice.message.content.trim();
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Groq API error: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Parse LLM response for profile extraction
 */
function parseLLMResponse(response: string): LLMProfileExtractionResponse {
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
  
  try {
    return JSON.parse(cleaned) as LLMProfileExtractionResponse;
  } catch (error) {
    // Try to extract JSON from response
    const jsonPatterns = [
      /\{[\s\S]*"facts"[\s\S]*\}/,
      /\{[\s\S]*\}/,
    ];
    
    for (const pattern of jsonPatterns) {
      const matches = cleaned.match(pattern);
      if (matches && matches[0]) {
        try {
          const parsed = JSON.parse(matches[0]);
          if (parsed.facts !== undefined || parsed.contradictions !== undefined) {
            return parsed as LLMProfileExtractionResponse;
          }
        } catch (e) {
          continue;
        }
      }
    }
    
    throw new Error(`No valid JSON found in LLM response. First 200 chars: ${cleaned.substring(0, 200)}`);
  }
}

/**
 * Extract profile facts from transcript summary
 * 
 * Extracts structured facts and detects contradictions with previous facts.
 * Runs every 60-120 seconds.
 * 
 * @param input - Profile extraction input
 * @returns Extracted profile facts and detected contradictions
 */
export async function extractProfileFacts(input: ProfileExtractionInput): Promise<{
  facts: ProfileFacts;
  contradictions: Array<{ msg: string; severity: 'minor' | 'medium' | 'major' | 'red_flag'; field?: string }>;
}> {
  // Build prompt with previous facts summary if available
  const previousFactsSummary = input.previous_facts
    ? summarizeFactsJSON(input.previous_facts)
    : undefined;
  
  const systemPrompt = buildProfileExtractionPrompt(previousFactsSummary);
  
  // Compress transcript summary
  const transcriptSummary = input.transcript_summary.substring(0, 1000);
  
  const userMessage = JSON.stringify({
    transcript_summary: transcriptSummary
  });
  
  try {
    const rawResponse = await callLLMForProfileExtraction(systemPrompt, userMessage);
    const parsed = parseLLMResponse(rawResponse);
    
    return {
      facts: parsed.facts || {},
      contradictions: parsed.contradictions || []
    };
  } catch (error) {
    console.error('Error in profile extraction:', error);
    return {
      facts: {},
      contradictions: []
    };
  }
}

