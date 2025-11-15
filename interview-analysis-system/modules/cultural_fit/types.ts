/**
 * TypeScript interfaces for the Cultural Fit Detection module
 */

/**
 * Parsed company culture values from text file
 */
export interface CompanyCultureValues {
  /** Company name (if specified in the text) */
  company_name?: string;
  /** Core values extracted from the text */
  core_values: string[];
  /** Positive dimensions/behaviors the company values */
  positive_values?: string[];
  /** Negative behaviors the company avoids */
  negative_values?: string[];
  /** Raw text content for reference */
  raw_text?: string;
}

/**
 * Input to the cultural fit evaluation function
 */
export interface CulturalFitInput {
  /** The latest transcript chunk from the candidate */
  latest_chunk: string;
  /** Summary of previous conversation history and signals */
  history_summary?: string;
  /** Previous cultural fit score (0-100) */
  previous_score: number;
  /** Path to company values text file, or company values object */
  company_values_file_path?: string;
  /** Company culture values (if not using file path) */
  company_values?: CompanyCultureValues;
}

/**
 * A cultural signal detected in the candidate's speech
 */
export interface CulturalSignal {
  /** Whether this is a positive or negative signal */
  type: 'positive' | 'negative';
  /** Human-readable message describing the signal */
  msg: string;
  /** Optional dimension this signal relates to (e.g., "ownership", "accountability") */
  dimension?: string;
}

/**
 * Score trend indicator showing change from previous score
 */
export type ScoreTrend = string; // e.g., "+3", "-2", "0"

/**
 * Output from the cultural fit evaluation
 */
export interface CulturalFitOutput {
  /** Current cultural fit score (0-100) */
  cultural_score: number;
  /** Trend indicator showing change from previous score (e.g., "+3", "-2") */
  trend: ScoreTrend;
  /** Array of detected cultural signals */
  signals: CulturalSignal[];
  /** Human-readable label for the score range */
  label: 'High Fit' | 'Moderate Fit' | 'Low Fit' | 'At Risk';
}

/**
 * Raw response from the LLM before processing
 */
export interface LLMCulturalFitResponse {
  /** Instant cultural score from this chunk (before smoothing) */
  cultural_score?: number;
  /** Trend indicator */
  trend?: string;
  /** Signals detected */
  signals?: Array<{ type: 'positive' | 'negative'; msg: string }>;
  /** Label for the score */
  label?: string;
  /** Optional delta value for score adjustment */
  delta?: number;
}

