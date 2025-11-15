/**
 * Diarization Simulator
 * 
 * Simulates speaker diarization by:
 * 1. Filtering only candidate utterances from the transcript
 * 2. Grouping them into chunks (simulating ~10-20 second segments)
 * 3. Returning candidate-only speech chunks
 */

import { getCandidateUtterances } from './fakeTranscript';

/**
 * Get simulated candidate speech chunks
 * 
 * In a real system, diarization would:
 * - Identify speaker segments from audio
 * - Filter out recruiter/interviewer speech
 * - Group candidate speech into time-based chunks
 * 
 * This simulator treats each candidate utterance as a separate chunk,
 * simulating real-time processing where each chunk represents
 * approximately 10-20 seconds of speech.
 * 
 * @returns Array of candidate speech chunks (strings)
 */
export function getSimulatedCandidateChunks(): string[] {
  // Get all candidate utterances
  const candidateUtterances = getCandidateUtterances();
  
  // In a real system, we might group multiple utterances into chunks
  // based on time windows (e.g., 10-20 seconds). For simulation purposes,
  // we'll treat each utterance as a separate chunk to see granular
  // cultural fit evaluation over time.
  
  return candidateUtterances;
}

/**
 * Get candidate chunks with metadata
 * 
 * @returns Array of chunks with optional metadata
 */
export interface ChunkMetadata {
  chunk: string;
  chunkIndex: number;
  totalChunks: number;
}

export function getSimulatedCandidateChunksWithMetadata(): ChunkMetadata[] {
  const chunks = getSimulatedCandidateChunks();
  
  return chunks.map((chunk, index) => ({
    chunk,
    chunkIndex: index + 1,
    totalChunks: chunks.length
  }));
}

/**
 * Simulate chunking with time-based grouping
 * 
 * Groups utterances into chunks based on estimated speaking time
 * (assuming ~150 words per minute, ~2.5 words per second)
 * 
 * @param wordsPerChunk - Approximate number of words per chunk (default: 30-40 words = ~12-16 seconds)
 * @returns Array of grouped chunks
 */
export function getTimeBasedChunks(wordsPerChunk: number = 35): string[] {
  const utterances = getCandidateUtterances();
  const chunks: string[] = [];
  let currentChunk: string[] = [];
  let currentWordCount = 0;
  
  for (const utterance of utterances) {
    const wordCount = utterance.split(/\s+/).length;
    
    if (currentWordCount + wordCount <= wordsPerChunk && currentChunk.length > 0) {
      // Add to current chunk
      currentChunk.push(utterance);
      currentWordCount += wordCount;
    } else {
      // Start new chunk
      if (currentChunk.length > 0) {
        chunks.push(currentChunk.join(' '));
      }
      currentChunk = [utterance];
      currentWordCount = wordCount;
    }
  }
  
  // Add final chunk
  if (currentChunk.length > 0) {
    chunks.push(currentChunk.join(' '));
  }
  
  return chunks;
}

