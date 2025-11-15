/**
 * System prompt for LLM-based cultural fit evaluation
 * 
 * This prompt instructs the LLM to analyze candidate speech for cultural fit signals
 * and return structured JSON with scores and signals.
 */

import { CompanyCultureValues } from './types';

/**
 * Build a dynamic system prompt based on company culture values
 * 
 * @param companyValues - Optional company culture values to customize the prompt
 * @returns System prompt string
 */
export function buildCulturalFitSystemPrompt(companyValues?: CompanyCultureValues | null): string {
  // COMPRESSED PROMPT - Optimized for speed
  // Keep it under 1500 chars to avoid latency explosion
  
  let companySection = '';
  if (companyValues && companyValues.core_values.length > 0) {
    // Compress company values to max 3-4 core values
    const coreValues = companyValues.core_values.slice(0, 4).map(v => {
      // Extract just the key word (first word before dash or colon)
      const key = v.split(/[-:]/)[0].trim();
      return key;
    }).join(', ');
    
    companySection = `Company values: ${coreValues}. `;
  }

  // Ultra-compressed prompt
  return `Evaluate cultural fit. ${companySection}Positive: ownership, accountability, curiosity, teamwork, humility, communication, growth, transparency (+1 to +5). Negative: blame-shift (-3), arrogance (-2), avoidance (-2), vagueness (-1), contradiction (-2), no-curiosity (-1), toxic (-4), excuses (-2), values-mismatch (-5). Red flags: hostile, no-responsibility, dishonest, extreme-arrogance (-10). Base: 50. Score 0-100. Labels: ≥75 High, 50-74 Moderate, 25-49 Low, <25 At Risk. Return JSON only: {"cultural_score":number,"trend":"+3","signals":[{"type":"positive|negative","msg":"text"}],"label":"High Fit|Moderate Fit|Low Fit|At Risk"}. No reasoning. No explanations. JSON only.`;
}

/**
 * Default system prompt (for backward compatibility)
 * Uses standard cultural dimensions without company-specific values
 */
export const culturalFitSystemPrompt = buildCulturalFitSystemPrompt();
