/**
 * Local contradiction scan implementation
 * 
 * Compares latest chunk with recent context (last 2 minutes)
 * to detect immediate contradictions.
 */

import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { LocalScanInput, Contradiction, LLMLocalScanResponse } from './types';
import { buildLocalScanPrompt } from './prompt_local';

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
 * Call LLM for local contradiction scan using OpenAI
 */
async function callLLMForLocalScan(systemPrompt: string, userMessage: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error('OPENAI_API_KEY not found in environment variables');
  }

  const model = process.env.LLM_MODEL || 'gpt-4o'; // Default to GPT-4o
  
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
        max_tokens: 200,
        top_p: 1,
        response_format: { type: 'json_object' } // Force JSON output
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error response:', errorText);
      throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
    }
    
    // OpenAI API returns JSON directly (non-streaming)
    const data = await response.json();
    const choice = data.choices?.[0];
    
    if (!choice?.message?.content) {
      throw new Error('OpenAI API returned empty content');
    }
    
    const fullContent = choice.message.content;
    
    // OpenAI with response_format: json_object should return pure JSON
    return fullContent.trim();
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`OpenAI API error: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Parse LLM response for local scan
 */
function parseLLMResponse(response: string): LLMLocalScanResponse {
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
  
  // For thinking models, the JSON is often at the END of the reasoning
  // Try to find the last JSON object in the response
  const lastBrace = cleaned.lastIndexOf('}');
  if (lastBrace > 0) {
    // Work backwards to find the matching opening brace
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
        if (parsed.contradictions !== undefined) {
          return parsed as LLMLocalScanResponse;
        }
      } catch (e) {
        // Continue to try other methods
      }
    }
  }
  
  try {
    return JSON.parse(cleaned) as LLMLocalScanResponse;
  } catch (error) {
    // Try to extract JSON from response (look for JSON with "contradictions" field)
    // Search from the end backwards (thinking models put JSON at the end)
    const contradictionsPattern = /"contradictions"\s*:\s*\[/;
    const contradictionsIndex = cleaned.lastIndexOf('"contradictions"');
    
    if (contradictionsIndex >= 0) {
      // Found "contradictions", try to extract the JSON object containing it
      // Find the opening brace before "contradictions"
      let jsonStart = cleaned.lastIndexOf('{', contradictionsIndex);
      if (jsonStart < 0) {
        // Try to find it by going backwards from contradictions
        jsonStart = cleaned.substring(0, contradictionsIndex).lastIndexOf('{');
      }
      
      if (jsonStart >= 0) {
        // Find the matching closing brace
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
            if (parsed.contradictions !== undefined) {
              return parsed as LLMLocalScanResponse;
            }
          } catch (e) {
            // Continue
          }
        }
      }
    }
    
    // Last resort: try simple patterns
    const jsonPatterns = [
      /\{[\s\S]*?"contradictions"[\s\S]*?\}/,
      /\{[\s\S]*\}/,
    ];
    
    for (const pattern of jsonPatterns) {
      const matches = cleaned.match(pattern);
      if (matches && matches[0]) {
        try {
          const parsed = JSON.parse(matches[0]);
          if (parsed.contradictions !== undefined) {
            return parsed as LLMLocalScanResponse;
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
 * Perform local contradiction scan
 * 
 * Compares latest chunk with recent context to detect contradictions.
 * Runs every ~10 seconds.
 * 
 * @param input - Local scan input
 * @returns Array of detected contradictions
 */
export async function localContradictionScan(input: LocalScanInput): Promise<Contradiction[]> {
  const systemPrompt = buildLocalScanPrompt();
  
  // Compress inputs
  const latestChunk = input.latest_chunk.substring(0, 300);
  const recentContext = input.recent_context.substring(0, 500);
  
  const userMessage = JSON.stringify({
    latest_chunk: latestChunk,
    recent_context: recentContext,
    previous_score: input.previous_score
  });
  
  try {
    const rawResponse = await callLLMForLocalScan(systemPrompt, userMessage);
    const parsed = parseLLMResponse(rawResponse);
    
    return parsed.contradictions || [];
  } catch (error) {
    console.error('Error in local contradiction scan:', error);
    return [];
  }
}

