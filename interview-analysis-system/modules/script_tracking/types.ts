/**
 * TypeScript types for the Script Tracking module
 */

/**
 * Result of classifying a transcript chunk
 */
export type ClassificationResult = {
  /** Section ID (1-5) or null if not classifiable */
  section: number | null;
  /** Subsection ID (e.g., "1.1", "2.3") or null */
  subsection: string | null;
  /** Confidence score (0-1) */
  confidence: number;
  /** Whether this represents a deviation from expected flow */
  deviation: boolean;
  /** Whether the topic is completely off-script */
  isOffScript: boolean;
  /** Human-readable reason for the classification */
  reason: string;
};

/**
 * Deviation detection result
 */
export type DeviationResult = {
  /** Whether a deviation was detected */
  deviation: boolean;
  /** Type of deviation: 'jump_ahead', 'going_backward', 'off_script', 'mixed_topics', 'out_of_order' */
  type: string | null;
  /** Human-readable message explaining the deviation */
  message: string | null;
};

/**
 * Script state for UI overlay
 */
export type ScriptState = {
  /** Current section being discussed (1-5) */
  currentSection: number;
  /** Map of section IDs to completion status */
  completedSections: Record<number, boolean>;
  /** Map of subsection IDs to completion status */
  completedSubsections: Record<string, boolean>;
  /** Current subsection being discussed */
  currentSubsection: string | null;
  /** Progress percentage (0-100) */
  progress: number;
  /** Total number of sections */
  totalSections: number;
  /** Total number of subsections */
  totalSubsections: number;
  /** Number of completed sections */
  completedSectionsCount: number;
  /** Number of completed subsections */
  completedSubsectionsCount: number;
  /** Timestamp of last update */
  lastUpdate: number;
};

/**
 * Complete output from processTranscriptChunk
 */
export type ScriptTrackingOutput = {
  /** LLM classification result */
  llm: ClassificationResult;
  /** Deviation detection result */
  deviation: DeviationResult;
  /** Current script state */
  scriptState: ScriptState;
};

/**
 * Raw LLM response for classification
 */
export interface LLMClassificationResponse {
  section?: number | null;
  subsection?: string | null;
  confidence?: number;
  deviation?: boolean;
  isOffScript?: boolean;
  reason?: string;
}

