/**
 * Main cultural fit evaluator
 * 
 * This module orchestrates the cultural fit evaluation by:
 * 1. Calling the LLM with the system prompt and candidate input
 * 2. Parsing the LLM response
 * 3. Applying score smoothing logic
 * 4. Enriching signals with metadata
 * 5. Returning structured output
 */

import { CulturalFitInput, CulturalFitOutput, CulturalSignal, LLMCulturalFitResponse } from './types';
import { buildCulturalFitSystemPrompt } from './culturalFitPrompt';
import { computeNewScore, computeTrend, labelScore } from './scoringLogic';
import { getCompanyValues } from './companyValuesParser';
import Groq from 'groq-sdk';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load .env file from cultural_fit directory or project root
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: join(__dirname, '.env') }); // Try cultural_fit/.env first
config({ path: join(__dirname, '..', '.env') }); // Fallback to project root/.env

/**
 * Configuration for LLM calls
 */
interface LLMConfig {
  model: string;
  system: string;
  user: string;
  temperature?: number;
  maxTokens?: number;
}

/**
 * Type for LLM call function (allows injection for testing)
 */
export type LLMCallFunction = (config: LLMConfig) => Promise<string>;

/**
 * Groq LLM call function using llama-4-maverick model
 * 
 * Optimized for speed:
 * - Uses streaming with early stopping when JSON is complete
 * - Reduced max_completion_tokens to 250
 * - Lower temperature (0.1) for faster, more deterministic output
 * 
 * @param config - LLM configuration
 * @returns Raw response string from LLM
 */
async function defaultCallLLM(config: LLMConfig): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;
  
  if (!apiKey) {
    throw new Error(
      'GROQ_API_KEY not found in environment variables. ' +
      'Please set GROQ_API_KEY in your .env file.'
    );
  }
  
  // Log exact API call details for debugging
  const apiCallDetails: any = {
    model: 'meta-llama/llama-4-maverick-17b-128e-instruct',
    messages: [
      {
        role: 'system',
        content: config.system
      },
      {
        role: 'user',
        content: config.user
      }
    ],
    temperature: 0.1,
    max_completion_tokens: 200, // Reduced from 300
    top_p: 1,
    stream: true
  };
  
  // Try to use response_format if Groq supports it (faster JSON generation)
  // Note: Check Groq docs - may need different format
  // apiCallDetails.response_format = { type: 'json_object' };
  
  console.log('\n📡 EXACT API CALL:');
  console.log('─'.repeat(70));
  console.log(JSON.stringify(apiCallDetails, null, 2));
  console.log('─'.repeat(70));
  console.log('\n📝 SYSTEM PROMPT (FULL):');
  console.log('─'.repeat(70));
  console.log(config.system);
  console.log('─'.repeat(70));
  console.log(`📏 System prompt length: ${config.system.length} characters`);
  console.log('\n💬 USER MESSAGE (JSON INPUT):');
  console.log('─'.repeat(70));
  console.log(config.user);
  console.log('─'.repeat(70));
  console.log(`📏 User message length: ${config.user.length} characters`);
  console.log('─'.repeat(70));
  console.log('');
  
  const client = new Groq({
    apiKey: apiKey
  });
  
  try {
    // Use streaming for faster response times
    const stream = await client.chat.completions.create(apiCallDetails);
    
    // Collect streaming chunks and stop early when JSON is complete
    let fullContent = '';
    const maxTokens = 200; // Reduced for faster response
    let tokenCount = 0;
    let foundJsonStart = false;
    let jsonStartIndex = -1;
    
    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content || '';
      if (delta) {
        fullContent += delta;
        tokenCount++;
        
        // Check if we've found the start of JSON
        if (!foundJsonStart) {
          const braceIndex = fullContent.indexOf('{');
          if (braceIndex >= 0) {
            foundJsonStart = true;
            jsonStartIndex = braceIndex;
            // If there's text before the JSON, we'll extract it later
          }
        }
        
        // If we've found JSON start, check if it's complete
        if (foundJsonStart) {
          // Extract JSON portion (from first { to end)
          const jsonPortion = jsonStartIndex >= 0 
            ? fullContent.substring(jsonStartIndex)
            : fullContent;
          
          const trimmed = jsonPortion.trim();
          if (trimmed.endsWith('}')) {
            try {
              // Try to parse to verify it's complete and valid JSON
              const parsed = JSON.parse(trimmed);
              // Verify it has the required field
              if (parsed.cultural_score !== undefined && parsed.cultural_score !== null) {
                // JSON is complete and valid, return only the JSON portion
                return trimmed;
              }
            } catch {
              // Not complete yet, continue
            }
          }
        }
        
        // Safety: stop if we've reached max tokens
        if (tokenCount >= maxTokens) {
          break;
        }
      }
    }
    
    // If we found JSON start, extract it even if not complete
    if (foundJsonStart && jsonStartIndex >= 0) {
      const jsonCandidate = fullContent.substring(jsonStartIndex);
      // Try to find complete JSON object
      const jsonMatch = jsonCandidate.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return jsonMatch[0];
      }
      return jsonCandidate; // Return what we have
    }
    
    if (!fullContent || fullContent.trim().length === 0) {
      throw new Error('Empty response from Groq API');
    }
    
    // Log response for debugging
    console.log('\n📥 RAW API RESPONSE (first 500 chars):');
    console.log(fullContent.substring(0, 500) + (fullContent.length > 500 ? '...' : ''));
    console.log(`📏 Response length: ${fullContent.length} characters`);
    console.log('─'.repeat(70));
    console.log('');
    
    return fullContent.trim();
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Groq API error: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Parse LLM response and extract JSON
 * Handles cases where LLM wraps JSON in markdown code blocks or adds explanatory text
 * 
 * @param response - Raw response string from LLM
 * @returns Parsed JSON object
 */
function parseLLMResponse(response: string): LLMCulturalFitResponse {
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
  
  // Try direct parsing first
  try {
    return JSON.parse(cleaned) as LLMCulturalFitResponse;
  } catch (error) {
    // If direct parsing fails, try to extract JSON object from the response
    // Look for JSON object that starts with { and ends with }
    // Use a more robust regex that handles nested objects
    const jsonPatterns = [
      /\{[\s\S]*"cultural_score"[\s\S]*\}/,  // Must contain cultural_score
      /\{[\s\S]*\}/,  // Any JSON object
    ];
    
    for (const pattern of jsonPatterns) {
      const matches = cleaned.match(pattern);
      if (matches && matches[0]) {
        try {
          const parsed = JSON.parse(matches[0]);
          // Verify it has the required field
          if (parsed.cultural_score !== undefined && parsed.cultural_score !== null) {
            return parsed as LLMCulturalFitResponse;
          }
        } catch (e) {
          // Try next pattern
          continue;
        }
      }
    }
    
    // Last resort: try to find JSON in the last part of the response
    // (sometimes LLM puts JSON at the end after explanations)
    const lines = cleaned.split('\n');
    for (let i = lines.length - 1; i >= 0; i--) {
      const line = lines[i].trim();
      if (line.startsWith('{')) {
        // Try to find the complete JSON from this line to the end
        const jsonCandidate = lines.slice(i).join('\n').trim();
        const jsonMatch = jsonCandidate.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            const parsed = JSON.parse(jsonMatch[0]);
            if (parsed.cultural_score !== undefined && parsed.cultural_score !== null) {
              return parsed as LLMCulturalFitResponse;
            }
          } catch (e) {
            // Continue searching
          }
        }
      }
    }
    
    throw new Error(`No valid JSON found in LLM response. First 200 chars: ${cleaned.substring(0, 200)}`);
  }
}

/**
 * Validate and normalize LLM response
 * Ensures all required fields are present and within valid ranges
 * 
 * @param parsed - Parsed LLM response
 * @param previousScore - Previous cultural fit score for validation
 * @returns Validated and normalized response
 */
function validateLLMResponse(
  parsed: LLMCulturalFitResponse,
  previousScore: number
): LLMCulturalFitResponse {
  // Ensure cultural_score is present and valid
  if (parsed.cultural_score === undefined || parsed.cultural_score === null) {
    // Log the parsed object for debugging
    console.error('❌ LLM response missing cultural_score. Parsed object:', JSON.stringify(parsed, null, 2));
    throw new Error('LLM response missing cultural_score field');
  }
  
  // Clamp score to 0-100 range
  const score = Math.max(0, Math.min(100, parsed.cultural_score));
  
  // Ensure signals array exists
  const signals = parsed.signals || [];
  
  // Ensure label exists or compute it
  const label = parsed.label || labelScore(score);
  
  // Ensure trend exists or compute it (will be recomputed later with smoothing)
  const trend = parsed.trend || '0';
  
  return {
    cultural_score: score,
    trend,
    signals,
    label
  };
}

/**
 * Main function to evaluate cultural fit from a transcript chunk
 * 
 * This function:
 * 1. Prepares the input for the LLM
 * 2. Calls the LLM with the system prompt
 * 3. Parses and validates the response
 * 4. Applies score smoothing
 * 5. Computes trend
 * 6. Enriches signals
 * 7. Returns structured output
 * 
 * @param input - Cultural fit evaluation input
 * @param llmCallFn - Optional LLM call function (for testing/mocking)
 * @returns Cultural fit evaluation output
 */
export async function evaluateCulturalFit(
  input: CulturalFitInput,
  llmCallFn?: LLMCallFunction
): Promise<CulturalFitOutput> {
  // Validate input
  if (!input.latest_chunk || input.latest_chunk.trim().length === 0) {
    throw new Error('latest_chunk cannot be empty');
  }
  
  if (input.previous_score < 0 || input.previous_score > 100) {
    throw new Error('previous_score must be between 0 and 100');
  }
  
  // Load company values if provided
  const companyValues = getCompanyValues(input);
  
  // Build dynamic system prompt based on company values
  const systemPrompt = buildCulturalFitSystemPrompt(companyValues);
  
  // Compress history_summary to max 100 chars (was 889 chars - too long!)
  let compressedHistory = input.history_summary || '';
  if (compressedHistory.length > 100) {
    // Keep only the most recent/relevant sentence
    const sentences = compressedHistory.split(/[.!?]+/).filter(s => s.trim().length > 0);
    compressedHistory = sentences.slice(-1)[0]?.substring(0, 100) || compressedHistory.substring(0, 100);
  }
  
  // Prepare user message for LLM (compact JSON, no pretty printing)
  const userMessage = JSON.stringify({
    chunk: input.latest_chunk.substring(0, 300), // Limit chunk to 300 chars
    hist: compressedHistory || 'none',
    prev: input.previous_score
  });
  
  // Call LLM (use provided function or default)
  const callLLM = llmCallFn || defaultCallLLM;
  // Model is hardcoded to llama-4-maverick in defaultCallLLM, but we pass it for consistency
  const model = process.env.LLM_MODEL || 'meta-llama/llama-4-maverick-17b-128e-instruct';
  
  const rawResponse = await callLLM({
    model,
    system: systemPrompt,
    user: userMessage,
    temperature: 0.1, // Lower temperature for faster inference
    maxTokens: 200 // Reduced for faster response
  });
  
  // Parse LLM response
  let parsed: LLMCulturalFitResponse;
  try {
    parsed = parseLLMResponse(rawResponse);
    
    // Debug: log if response is missing required fields
    if (!parsed.cultural_score && parsed.cultural_score !== 0) {
      console.warn('⚠️  LLM response missing cultural_score. Raw response:', rawResponse.substring(0, 200));
    }
  } catch (error) {
    // If parsing fails, log the raw response for debugging
    console.error('❌ Failed to parse LLM response:', error);
    console.error('Raw response (first 500 chars):', rawResponse.substring(0, 500));
    return {
      cultural_score: input.previous_score, // Keep previous score
      trend: '0',
      signals: [{
        type: 'negative',
        msg: 'Failed to parse LLM response. Evaluation error occurred.'
      }],
      label: labelScore(input.previous_score)
    };
  }
  
  // Validate response
  const validated = validateLLMResponse(parsed, input.previous_score);
  
  // Apply smoothing formula: new_score = previous_score * 0.7 + instant_score * 0.3
  const smoothedScore = computeNewScore(input.previous_score, validated.cultural_score);
  
  // Compute trend
  const trend = computeTrend(input.previous_score, smoothedScore);
  
  // Enrich signals with proper typing
  const enrichedSignals: CulturalSignal[] = validated.signals.map(signal => ({
    type: signal.type,
    msg: signal.msg
  }));
  
  // Assign label based on smoothed score
  const finalLabel = labelScore(smoothedScore);
  
  // Return structured output
  return {
    cultural_score: smoothedScore,
    trend,
    signals: enrichedSignals,
    label: finalLabel
  };
}

