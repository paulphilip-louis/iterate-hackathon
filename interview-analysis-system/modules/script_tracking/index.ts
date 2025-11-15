/**
 * Script Tracking Module - Main Entry Point
 * 
 * This module tracks interview script progression in real-time.
 * It classifies transcript chunks, detects deviations, and maintains script state.
 */

import { classifyChunk } from './llmClassifier';
import { detectDeviation } from './deviationDetector';
import { ScriptTracker } from './scriptTracker';
import { ScriptTrackingOutput } from './types';

// Global script tracker instance (singleton pattern)
let scriptTracker: ScriptTracker | null = null;

/**
 * Get or create the script tracker instance
 */
function getScriptTracker(): ScriptTracker {
  if (!scriptTracker) {
    scriptTracker = new ScriptTracker();
  }
  return scriptTracker;
}

/**
 * Reset the script tracker (for new interview)
 */
export function resetScriptTracker(): void {
  scriptTracker = new ScriptTracker();
}

/**
 * Process a transcript chunk and return classification, deviation, and script state
 * 
 * This is the main function to call for each transcript chunk.
 * It:
 * 1. Classifies the chunk using LLM
 * 2. Detects deviations from expected flow
 * 3. Updates script tracker state
 * 4. Returns complete output for UI overlay
 * 
 * @param chunk - Transcript chunk to process
 * @returns Complete script tracking output
 */
export async function processTranscriptChunk(chunk: string): Promise<ScriptTrackingOutput> {
  const tracker = getScriptTracker();
  const previousSection = tracker.currentSection;

  // 1. Classify chunk using LLM
  const llmResult = await classifyChunk(chunk);

  // 2. Detect deviation
  const deviation = detectDeviation(
    previousSection,
    llmResult.section,
    llmResult.isOffScript
  );

  // 3. Update script tracker state
  tracker.updateFromLLM(llmResult);

  // 4. Get current script state
  const scriptState = tracker.getState();

  return {
    llm: llmResult,
    deviation,
    scriptState
  };
}

/**
 * Get current script state without processing a chunk
 * 
 * @returns Current script state
 */
export function getScriptState() {
  const tracker = getScriptTracker();
  return tracker.getState();
}

/**
 * Manually mark a subsection as completed
 * 
 * @param subsectionId - Subsection ID (e.g., "1.1")
 */
export function markSubsectionCompleted(subsectionId: string): void {
  const tracker = getScriptTracker();
  tracker.markSubsectionCompleted(subsectionId);
}

/**
 * Manually mark a section as completed
 * 
 * @param sectionId - Section ID (1-6)
 */
export function markSectionCompleted(sectionId: number): void {
  const tracker = getScriptTracker();
  tracker.markSectionCompleted(sectionId);
}

// Export all types and utilities
export * from './types';
export * from './interviewScript';
export * from './scriptTracker';
export * from './llmClassifier';
export * from './deviationDetector';

