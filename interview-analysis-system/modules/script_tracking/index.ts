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

// Accumulate last 2-3 chunks for better context
const chunkHistory: string[] = [];
const MAX_HISTORY = 3;

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
  chunkHistory.length = 0; // Clear history
}

/**
 * Process a transcript chunk and return classification, deviation, and script state
 * 
 * This is the main function to call for each transcript chunk.
 * It:
 * 1. Accumulates the last 2-3 chunks for better context
 * 2. Classifies the accumulated chunk using LLM
 * 3. Detects deviations from expected flow
 * 4. Updates script tracker state
 * 5. Returns complete output for UI overlay
 * 
 * @param chunk - Transcript chunk to process
 * @returns Complete script tracking output
 */
export async function processTranscriptChunk(chunk: string): Promise<ScriptTrackingOutput> {
  const tracker = getScriptTracker();
  const previousSection = tracker.currentSection;

  // 1. Accumulate chunks: add current chunk to history
  chunkHistory.push(chunk);
  if (chunkHistory.length > MAX_HISTORY) {
    chunkHistory.shift(); // Remove oldest chunk
  }

  // 2. Combine last 2-3 chunks for better context
  const accumulatedChunk = chunkHistory.join(' ').trim();
  console.log(`📚 Processing accumulated chunk (${chunkHistory.length} chunks, ${accumulatedChunk.length} chars)`);

  // 3. Classify accumulated chunk using LLM (with keyword fallback)
  console.log(`🔍 Classifying chunk: "${accumulatedChunk.substring(0, 100)}${accumulatedChunk.length > 100 ? '...' : ''}"`);
  const llmResult = await classifyChunk(accumulatedChunk);
  console.log(`✅ Classification result:`, {
    section: llmResult.section,
    subsection: llmResult.subsection,
    confidence: llmResult.confidence,
    isOffScript: llmResult.isOffScript,
    reason: llmResult.reason
  });

  // 4. Detect deviation
  const deviation = detectDeviation(
    previousSection,
    llmResult.section,
    llmResult.isOffScript
  );

  // 5. Update script tracker state
  console.log(`📊 Before update: section=${tracker.currentSection}, subsection=${tracker.currentSubsection}`);
  tracker.updateFromLLM(llmResult);
  console.log(`📊 After update: section=${tracker.currentSection}, subsection=${tracker.currentSubsection}`);
  console.log(`📊 Completed subsections:`, Object.keys(tracker.completedSubsections).filter(id => tracker.completedSubsections[id]));

  // 6. Get current script state
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
 * @param sectionId - Section ID (1-5)
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
