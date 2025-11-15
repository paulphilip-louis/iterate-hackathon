/**
 * Diarization simulator for contradiction detection tests
 * 
 * Filters candidate-only utterances from fake transcript
 * and groups them into chunks.
 */

import { generateFakeTranscript, TranscriptEntry } from './fakeTranscript';

/**
 * Get simulated candidate-only chunks
 * 
 * Filters transcript to only candidate utterances and returns as array of strings
 * 
 * @returns Array of candidate speech chunks
 */
export function getSimulatedCandidateChunks(): string[] {
  const transcript = generateFakeTranscript();
  
  // Filter only candidate utterances
  const candidateUtterances = transcript
    .filter(entry => entry.speaker === 'candidate')
    .map(entry => entry.text);
  
  return candidateUtterances;
}

/**
 * Get transcript entries grouped by time windows
 * 
 * Useful for simulating recent_context and transcript_summary
 * 
 * @param windowSize - Number of entries per window
 * @returns Array of transcript windows
 */
export function getTranscriptWindows(windowSize: number = 5): string[][] {
  const chunks = getSimulatedCandidateChunks();
  const windows: string[][] = [];
  
  for (let i = 0; i < chunks.length; i += windowSize) {
    windows.push(chunks.slice(i, i + windowSize));
  }
  
  return windows;
}

/**
 * Create a summary string from transcript chunks
 * 
 * @param chunks - Array of transcript chunks
 * @returns Summary string
 */
export function summarizeChunks(chunks: string[]): string {
  return chunks.join(' ');
}

