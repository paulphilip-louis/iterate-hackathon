/**
 * TypeScript interfaces for the Fact Store module
 */

import { ProfileFacts } from '../contradiction_detection/types';

/**
 * In-memory fact store state
 */
export interface FactStore {
  /** Current stored profile facts */
  facts: ProfileFacts | null;
  /** Timestamp when facts were last updated */
  last_updated?: number;
}

/**
 * Merge strategy options
 */
export interface MergeOptions {
  /** Whether to keep conflicting facts or replace */
  keep_conflicts?: boolean;
  /** Minimum confidence threshold for accepting new facts */
  min_confidence?: number;
}

/**
 * Result of merging facts
 */
export interface MergeResult {
  /** Merged facts */
  merged_facts: ProfileFacts;
  /** List of conflicts detected during merge */
  conflicts: Array<{ field: string; old_value: any; new_value: any }>;
}

