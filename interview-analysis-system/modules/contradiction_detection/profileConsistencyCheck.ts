/**
 * Profile consistency check implementation
 * 
 * Compares new extracted facts with existing facts to detect contradictions using LLM.
 */

import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { ProfileFacts, Contradiction, LLMProfileConsistencyResponse } from './types';
import { buildProfileConsistencyPrompt } from './prompt_profileConsistency';
import { summarizeFactsJSON } from '../fact_store/summarizer';

// Load .env file from multiple possible locations
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..', '..');

// Try multiple .env locations
config({ path: join(projectRoot, '.env') }); // Project root
config({ path: join(projectRoot, 'Modules', '.env') }); // /Modules/.env
config({ path: join(projectRoot, 'modules', '.env') }); // /modules/.env

/**
 * Call LLM for profile consistency check using OpenAI
 */
async function callLLMForProfileConsistency(systemPrompt: string, userMessage: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error('OPENAI_API_KEY not found in environment variables');
  }

  // Use GPT-4o (or gpt-4o-mini for faster/cheaper)
  const model = process.env.LLM_MODEL || 'gpt-4o';
  
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
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
        top_p: 1,
        response_format: { type: 'json_object' } // Force JSON output
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error response:', errorText);
      throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    const choice = data.choices?.[0];
    
    if (!choice?.message?.content) {
      throw new Error('OpenAI API returned empty content');
    }
    
    return choice.message.content.trim();
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`OpenAI API error: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Parse LLM response for profile consistency check
 */
function parseLLMResponse(response: string): LLMProfileConsistencyResponse {
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
    return JSON.parse(cleaned) as LLMProfileConsistencyResponse;
  } catch (error) {
    // Try to extract JSON object
    const jsonMatch = cleaned.match(/\{[\s\S]*"contradictions"[\s\S]*\}/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]) as LLMProfileConsistencyResponse;
      } catch (e) {
        // Fall through to error
      }
    }
    
    throw new Error(`Failed to parse LLM response: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Compare two profile fact sets and detect contradictions using LLM
 * 
 * @param oldFacts - Previously stored profile facts
 * @param newFacts - Newly extracted profile facts
 * @returns List of detected contradictions
 */
export async function compareProfiles(
  oldFacts: ProfileFacts | null,
  newFacts: ProfileFacts
): Promise<Contradiction[]> {
  if (!oldFacts) {
    // No previous facts to compare against
    return [];
  }

  try {
    // Build system prompt
    const systemPrompt = buildProfileConsistencyPrompt();
    
    // Prepare user message with both fact sets as JSON
    const oldFactsJSON = summarizeFactsJSON(oldFacts);
    const newFactsJSON = summarizeFactsJSON(newFacts);
    
    const userMessage = JSON.stringify({
      old_facts: JSON.parse(oldFactsJSON),
      new_facts: JSON.parse(newFactsJSON)
    }, null, 2);
    
    // Call LLM
    const rawResponse = await callLLMForProfileConsistency(systemPrompt, userMessage);
    
    // Parse response
    const parsed = parseLLMResponse(rawResponse);
    
    // Convert to Contradiction format
    const contradictions: Contradiction[] = (parsed.contradictions || []).map(c => ({
      msg: c.msg,
      severity: c.severity,
      field: c.field
    }));
    
    return contradictions;
  } catch (error) {
    console.error('Error in profile consistency check:', error);
    // Return empty array on error (fail gracefully)
    return [];
  }
}

