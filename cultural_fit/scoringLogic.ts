/**
 * Scoring logic for cultural fit evaluation
 * Handles score smoothing, clamping, and label assignment
 */

import { ScoreTrend } from './types';

/**
 * Compute the new cultural fit score using exponential smoothing
 * 
 * Formula: new_score = previous_score * 0.7 + instant_score * 0.3
 * 
 * This is standard exponential smoothing where:
 * - 70% weight on previous (smoothed) score
 * - 30% weight on new instant score from LLM
 * 
 * @param previous - Previous cultural fit score (0-100)
 * @param instant - Instant score from current LLM evaluation (0-100)
 * @returns New smoothed score clamped between 0 and 100
 */
export function computeNewScore(previous: number, instant: number): number {
  // Apply exponential smoothing: 70% previous, 30% instant
  const smoothed = previous * 0.7 + instant * 0.3;
  
  // Clamp between 0 and 100
  return Math.max(0, Math.min(100, Math.round(smoothed)));
}

/**
 * Compute the trend indicator showing change from previous score
 * 
 * @param previous - Previous cultural fit score
 * @param current - Current cultural fit score
 * @returns Trend string (e.g., "+3", "-2", "0")
 */
export function computeTrend(previous: number, current: number): ScoreTrend {
  const change = Math.round(current - previous);
  
  if (change > 0) {
    return `+${change}`;
  } else if (change < 0) {
    return `${change}`; // Already includes minus sign
  } else {
    return '0';
  }
}

/**
 * Assign a label to a cultural fit score based on predefined ranges
 * 
 * - ≥75: High Fit
 * - 50-74: Moderate Fit
 * - 25-49: Low Fit
 * - <25: At Risk
 * 
 * @param score - Cultural fit score (0-100)
 * @returns Label string
 */
export function labelScore(score: number): 'High Fit' | 'Moderate Fit' | 'Low Fit' | 'At Risk' {
  if (score >= 75) {
    return 'High Fit';
  } else if (score >= 50) {
    return 'Moderate Fit';
  } else if (score >= 25) {
    return 'Low Fit';
  } else {
    return 'At Risk';
  }
}

// Note: calculateDelta is no longer needed with the corrected smoothing formula
// The computeNewScore function now takes the instant score directly

