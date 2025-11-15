/**
 * Deviation Detector
 * 
 * Detects when the interviewer deviates from the expected script flow.
 * Handles: jumping ahead, going backward, off-script topics, mixed topics, out of order.
 */

import { DeviationResult } from './types';
import { INTERVIEW_SCRIPT } from './interviewScript';

/**
 * Detect deviation from expected script flow
 * 
 * @param prevSection - Previous section number (1-6)
 * @param newSection - New section number (1-6) or null if not classifiable
 * @param isOffScript - Whether the topic is off-script
 * @returns Deviation detection result
 */
export function detectDeviation(
  prevSection: number,
  newSection: number | null,
  isOffScript: boolean = false
): DeviationResult {
  // If off-script, it's a clear deviation
  if (isOffScript) {
    return {
      deviation: true,
      type: 'off_script',
      message: 'The topic discussed is off the interview script'
    };
  }

  // If section is null, cannot determine deviation
  if (newSection === null) {
    return {
      deviation: false,
      type: null,
      message: null
    };
  }

  // Validate section range
  if (newSection < 1 || newSection > 6) {
    return {
      deviation: true,
      type: 'off_script',
      message: `Invalid section detected: ${newSection}`
    };
  }

  // Same section: no deviation (normal progression within section)
  if (newSection === prevSection) {
    return {
      deviation: false,
      type: null,
      message: null
    };
  }

  // Next section: normal progression (no deviation)
  if (newSection === prevSection + 1) {
    return {
      deviation: false,
      type: null,
      message: null
    };
  }

  // Going backward: deviation
  if (newSection < prevSection) {
    const sectionsSkipped = prevSection - newSection;
    return {
      deviation: true,
      type: 'going_backward',
      message: `Going backward: section ${prevSection} → ${newSection} (${sectionsSkipped} section(s) backward)`
    };
  }

  // Jumping ahead: deviation
  if (newSection > prevSection + 1) {
    const sectionsSkipped = newSection - prevSection - 1;
    const skippedSections = [];
    for (let i = prevSection + 1; i < newSection; i++) {
      skippedSections.push(i);
    }
    
    return {
      deviation: true,
      type: 'jump_ahead',
      message: `Section jump: ${prevSection} → ${newSection} (section(s) ${skippedSections.join(', ')} skipped)`
    };
  }

  // Should not reach here, but return no deviation as fallback
  return {
    deviation: false,
    type: null,
    message: null
  };
}

/**
 * Detect if multiple topics are being discussed (mixed topics)
 * 
 * @param classifications - Array of recent classification results
 * @returns Whether mixed topics are detected
 */
export function detectMixedTopics(
  classifications: Array<{ section: number | null; subsection: string | null }>
): boolean {
  if (classifications.length < 2) {
    return false;
  }

  // Get unique sections from recent classifications
  const uniqueSections = new Set<number>();
  classifications.forEach(classification => {
    if (classification.section !== null) {
      uniqueSections.add(classification.section);
    }
  });

  // If more than 2 different sections in recent chunks, likely mixed topics
  return uniqueSections.size > 2;
}

/**
 * Detect if sections are being discussed out of order
 * 
 * @param sectionHistory - Array of section numbers in chronological order
 * @returns Whether out-of-order progression is detected
 */
export function detectOutOfOrder(sectionHistory: number[]): boolean {
  if (sectionHistory.length < 3) {
    return false;
  }

  // Check if there's a pattern of going back and forth
  let directionChanges = 0;
  for (let i = 1; i < sectionHistory.length - 1; i++) {
    const prev = sectionHistory[i - 1];
    const curr = sectionHistory[i];
    const next = sectionHistory[i + 1];

    // If direction changes (forward then backward, or backward then forward)
    if (
      (curr > prev && next < curr) ||
      (curr < prev && next > curr)
    ) {
      directionChanges++;
    }
  }

  // If multiple direction changes, likely out of order
  return directionChanges >= 2;
}

/**
 * Get expected next section
 * 
 * @param currentSection - Current section number
 * @returns Expected next section number, or null if at end
 */
export function getExpectedNextSection(currentSection: number): number | null {
  if (currentSection >= INTERVIEW_SCRIPT.length) {
    return null; // Already at last section
  }
  return currentSection + 1;
}

/**
 * Get expected previous section
 * 
 * @param currentSection - Current section number
 * @returns Expected previous section number, or null if at start
 */
export function getExpectedPreviousSection(currentSection: number): number | null {
  if (currentSection <= 1) {
    return null; // Already at first section
  }
  return currentSection - 1;
}

