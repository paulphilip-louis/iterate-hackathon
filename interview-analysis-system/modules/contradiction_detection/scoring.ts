/**
 * Contradiction scoring logic
 * 
 * Computes contradiction score (0-100) based on detected contradictions.
 * No smoothing - direct impact on score.
 */

import { Contradiction } from './types';
import { ContradictionOutput } from './types';

/**
 * Compute delta score based on contradictions
 * 
 * Scoring (no smoothing - direct impact):
 * - minor: -5
 * - medium: -7
 * - major: -15
 * - red_flag: -30
 * 
 * @param contradictions - Array of detected contradictions
 * @returns Delta score (negative value)
 */
function computeDelta(contradictions: Contradiction[]): number {
  let delta = 0;
  
  for (const contradiction of contradictions) {
    switch (contradiction.severity) {
      case 'minor':
        delta -= 5;
        break;
      case 'medium':
        delta -= 7;
        break;
      case 'major':
        delta -= 15;
        break;
      case 'red_flag':
        delta -= 30;
        break;
    }
  }
  
  return delta;
}

/**
 * Compute contradiction score (no smoothing - direct impact)
 * 
 * Formula: new_score = previous_score + delta
 * 
 * @param previousScore - Previous contradiction score (0-100)
 * @param contradictions - Array of detected contradictions
 * @returns New score (0-100)
 */
export function computeContradictionScore(
  previousScore: number,
  contradictions: Contradiction[]
): number {
  const delta = computeDelta(contradictions);
  const newScore = previousScore + delta;
  
  // Clamp to 0-100 range
  return Math.max(0, Math.min(100, newScore));
}

/**
 * Compute trend indicator
 * 
 * @param previousScore - Previous score
 * @param newScore - New score
 * @returns Trend string (e.g., "+3", "-5")
 */
export function computeTrend(previousScore: number, newScore: number): string {
  const diff = newScore - previousScore;
  if (diff > 0) {
    return `+${Math.round(diff)}`;
  } else if (diff < 0) {
    return `${Math.round(diff)}`;
  } else {
    return '0';
  }
}

/**
 * Assign label based on score
 * 
 * - ≥75: "Consistent"
 * - 50-74: "Some Inconsistencies"
 * - 25-49: "High Risk"
 * - <25: "Severely Contradictory"
 * 
 * @param score - Contradiction score (0-100)
 * @returns Label string
 */
export function labelScore(score: number): 'Consistent' | 'Some Inconsistencies' | 'High Risk' | 'Severely Contradictory' {
  if (score >= 75) {
    return 'Consistent';
  } else if (score >= 50) {
    return 'Some Inconsistencies';
  } else if (score >= 25) {
    return 'High Risk';
  } else {
    return 'Severely Contradictory';
  }
}

/**
 * Compute full contradiction output
 * 
 * @param previousScore - Previous contradiction score
 * @param contradictions - Array of detected contradictions
 * @returns Complete contradiction output
 */
export function computeContradictionOutput(
  previousScore: number,
  contradictions: Contradiction[]
): ContradictionOutput {
  const newScore = computeContradictionScore(previousScore, contradictions);
  const trend = computeTrend(previousScore, newScore);
  const label = labelScore(newScore);
  
  return {
    contradiction_score: newScore,
    trend,
    contradictions,
    label
  };
}

