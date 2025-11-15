/**
 * TypeScript interfaces for the Contradiction Detection module
 */

/**
 * Severity levels for detected contradictions
 */
export type ContradictionSeverity = 'minor' | 'medium' | 'major' | 'red_flag';

/**
 * A detected contradiction with message and severity
 */
export interface Contradiction {
  /** Human-readable description of the contradiction */
  msg: string;
  /** Severity level of the contradiction */
  severity: ContradictionSeverity;
  /** Optional field/category this contradiction relates to (e.g., "years_experience", "job_title") */
  field?: string;
}

/**
 * Input for local contradiction scan (every 10 seconds)
 */
export interface LocalScanInput {
  /** The latest transcript chunk from the candidate */
  latest_chunk: string;
  /** Summary of the last 2 minutes of transcript */
  recent_context: string;
  /** Previous contradiction score (0-100) */
  previous_score: number;
}

/**
 * Input for profile extraction (every 60-120 seconds)
 */
export interface ProfileExtractionInput {
  /** Summary of the last 5 minutes of transcript */
  transcript_summary: string;
  /** Previous extracted profile facts */
  previous_facts?: ProfileFacts;
}

/**
 * Structured facts extracted from candidate profile
 */
export interface ProfileFacts {
  /** Years of experience claimed */
  years_experience?: number | string;
  /** List of job titles mentioned */
  job_titles?: string[];
  /** List of companies mentioned */
  companies?: string[];
  /** List of degrees/education mentioned */
  degrees?: string[];
  /** Leadership experience mentioned */
  leadership_experience?: string[];
  /** Programming languages mentioned */
  languages?: string[];
  /** Tech stack mentioned */
  tech_stack?: string[];
  /** Salary expectations mentioned */
  salary_expectations?: string | number;
  /** Other relevant facts */
  other_facts?: Record<string, any>;
  /** Confidence level (0-1) for these facts */
  confidence?: number;
  /** Timestamp when facts were extracted */
  extracted_at?: number;
}

/**
 * Result of comparing two profile fact sets
 */
export interface ProfileConsistencyResult {
  /** List of contradictions found */
  contradictions: Contradiction[];
  /** Updated merged facts */
  merged_facts: ProfileFacts;
}

/**
 * Output from contradiction detection module
 */
export interface ContradictionOutput {
  /** Current contradiction score (0-100, higher = more consistent) */
  contradiction_score: number;
  /** Trend indicator showing change from previous score (e.g., "+3", "-5") */
  trend: string;
  /** Array of detected contradictions */
  contradictions: Contradiction[];
  /** Human-readable label for the score range */
  label: 'Consistent' | 'Some Inconsistencies' | 'High Risk' | 'Severely Contradictory';
}

/**
 * Raw response from LLM for local scan
 */
export interface LLMLocalScanResponse {
  contradictions?: Array<{ msg: string; severity: ContradictionSeverity; field?: string }>;
}

/**
 * Raw response from LLM for profile extraction
 */
export interface LLMProfileExtractionResponse {
  facts?: ProfileFacts;
  contradictions?: Array<{ msg: string; severity: ContradictionSeverity; field?: string }>;
}

/**
 * Raw response from LLM for profile consistency check
 */
export interface LLMProfileConsistencyResponse {
  contradictions?: Array<{ msg: string; severity: ContradictionSeverity; field?: string }>;
}

