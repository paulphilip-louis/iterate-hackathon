/**
 * Merge strategy for combining profile facts
 * 
 * Handles conflicts and confidence-based merging
 */

import { ProfileFacts } from '../contradiction_detection/types';
import { MergeOptions, MergeResult } from './types';

/**
 * Merge new facts with existing facts using a confidence-based strategy
 * 
 * Rules:
 * - If new fact has higher confidence → replace
 * - If conflicting facts → store both + flag conflict
 * - If same fact → keep existing (no change)
 * 
 * @param oldFacts - Existing profile facts
 * @param newFacts - New profile facts to merge
 * @param options - Merge options
 * @returns Merge result with merged facts and conflicts
 */
export function mergeFacts(
  oldFacts: ProfileFacts | null,
  newFacts: ProfileFacts,
  options: MergeOptions = {}
): MergeResult {
  const conflicts: Array<{ field: string; old_value: any; new_value: any }> = [];
  
  if (!oldFacts) {
    // No existing facts, just use new facts
    return {
      merged_facts: { ...newFacts },
      conflicts: []
    };
  }
  
  const merged: ProfileFacts = { ...oldFacts };
  const minConfidence = options.min_confidence || 0.5;
  const keepConflicts = options.keep_conflicts ?? true;
  
  // Merge years_experience
  // CRITICAL: Only update if new value is NOT null/undefined (preserve old values)
  if (newFacts.years_experience !== undefined && newFacts.years_experience !== null) {
    if (oldFacts.years_experience !== undefined && 
        oldFacts.years_experience !== null &&
        oldFacts.years_experience !== newFacts.years_experience) {
      // Conflict detected - both have actual values and they differ
      const newConf = newFacts.confidence || 0.5;
      const oldConf = oldFacts.confidence || 0.5;
      
      if (newConf > oldConf && newConf >= minConfidence) {
        merged.years_experience = newFacts.years_experience;
        conflicts.push({
          field: 'years_experience',
          old_value: oldFacts.years_experience,
          new_value: newFacts.years_experience
        });
      } else if (keepConflicts) {
        // Keep both values in a conflict array
        merged.years_experience = [oldFacts.years_experience, newFacts.years_experience] as any;
        conflicts.push({
          field: 'years_experience',
          old_value: oldFacts.years_experience,
          new_value: newFacts.years_experience
        });
      }
    } else {
      // New value provided and no conflict - update it
      merged.years_experience = newFacts.years_experience;
    }
  }
  // If newFacts.years_experience is null/undefined, keep the old value (don't overwrite)
  
  // Merge arrays (job_titles, companies, degrees, etc.)
  // CRITICAL: Preserve old arrays if new ones are null/undefined/empty
  const arrayFields: (keyof ProfileFacts)[] = [
    'job_titles', 'companies', 'degrees', 'leadership_experience',
    'languages', 'tech_stack'
  ];
  
  for (const field of arrayFields) {
    const oldArray = oldFacts[field] as string[] | undefined;
    const newArray = newFacts[field] as string[] | undefined;
    
    if (newArray && newArray.length > 0) {
      // New array has values - merge with old
      if (oldArray && oldArray.length > 0) {
        // Merge arrays, removing duplicates - PRESERVE ALL VALUES
        const combined = [...new Set([...oldArray, ...newArray])];
        merged[field] = combined as any;
      } else {
        // No old array, use new one
        merged[field] = newArray as any;
      }
    }
    // If newArray is null/undefined/empty, keep the old array (don't overwrite)
  }
  
  // Merge salary_expectations
  // CRITICAL: Only update if new value is NOT null/undefined (preserve old values)
  if (newFacts.salary_expectations !== undefined && newFacts.salary_expectations !== null) {
    if (oldFacts.salary_expectations !== undefined &&
        oldFacts.salary_expectations !== null &&
        oldFacts.salary_expectations !== newFacts.salary_expectations) {
      // Conflict - both have values and they differ
      const newConf = newFacts.confidence || 0.5;
      const oldConf = oldFacts.confidence || 0.5;
      
      if (newConf > oldConf && newConf >= minConfidence) {
        merged.salary_expectations = newFacts.salary_expectations;
        conflicts.push({
          field: 'salary_expectations',
          old_value: oldFacts.salary_expectations,
          new_value: newFacts.salary_expectations
        });
      }
    } else {
      // New value provided and no conflict - update it
      merged.salary_expectations = newFacts.salary_expectations;
    }
  }
  // If newFacts.salary_expectations is null/undefined, keep the old value (don't overwrite)
  
  // Merge other_facts
  // Preserve old other_facts and merge with new ones
  merged.other_facts = {
    ...(oldFacts.other_facts || {}),
    ...(newFacts.other_facts || {})
  };
  
  // Update confidence (use higher of the two)
  merged.confidence = Math.max(
    oldFacts.confidence || 0.5,
    newFacts.confidence || 0.5
  );
  
  // Update timestamp
  merged.extracted_at = Date.now();
  
  return {
    merged_facts: merged,
    conflicts
  };
}

