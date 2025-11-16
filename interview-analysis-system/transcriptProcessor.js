/**
 * Transcript Processor - Orchestrates all analysis modules
 * 
 * Combine contradiction detection, script tracking, and other modules
 */

import { 
  localContradictionScan, 
  extractProfileFacts, 
  computeContradictionOutput 
} from './modules/contradiction_detection/index.js';
import { getFacts, updateFacts, resetFacts, mergeFacts } from './modules/fact_store/index.js';
import { compareProfiles } from './modules/contradiction_detection/index.js';
import { 
  processTranscriptChunk as processScriptChunk,
  resetScriptTracker 
} from './modules/script_tracking/index.js';
import { evaluateCulturalFit } from './modules/cultural_fit/index.js';

// État global pour cette interview
let contradictionScore = 100;
let culturalFitScore = 50; // Score initial de cultural fit
let recentContext = [];
let chunkCounter = 0;

// Accumulate chunks from both speakers for script tracking
let scriptChunkHistory = {
  candidate: [],
  recruiter: []
};
const MAX_SCRIPT_HISTORY = 3;

/**
 * ⚠️ FONCTION PRINCIPALE - Appelée à chaque chunk de transcript
 * 
 * @param {string} transcriptChunk - Le chunk de transcript
 * @param {string} speaker - 'candidate' ou 'recruiter'
 * @param {WebSocketServer} wss - Serveur WebSocket pour broadcast
 * @returns {Promise<Object>} - Résultats de l'analyse
 */
export async function processTranscriptChunk(transcriptChunk, speaker, wss) {
  chunkCounter++;
  console.log(`\n📝 Processing chunk #${chunkCounter} from ${speaker}`);
  
  // ============================================
  // 1. CONTRADICTION DETECTION
  // ============================================
  let localContradictions = [];
  try {
    console.log('🔍 Running contradiction scan...');
    const startTime = Date.now();
    
    localContradictions = await localContradictionScan({
      latest_chunk: transcriptChunk,
      recent_context: recentContext.join(' '),
      previous_score: contradictionScore
    });
    
    const elapsed = Date.now() - startTime;
    console.log(`⏱️  Contradiction scan took ${elapsed}ms`);
    
    if (localContradictions.length > 0) {
      console.log(`⚠️  Found ${localContradictions.length} contradiction(s)`);
    }
  } catch (error) {
    console.error('❌ Error in contradiction scan:', error);
  }
  
  // PROFILE EXTRACTION (toutes les 6 chunks)
  let profileContradictions = [];
  if (chunkCounter % 6 === 0 || chunkCounter === 1) {
    try {
      console.log('📊 Running profile extraction...');
      const startTime = Date.now();
      
      const transcriptSummary = recentContext.slice(-30).join(' ');
      const previousFacts = getFacts();
      
      const { facts, contradictions } = await extractProfileFacts({
        transcript_summary: transcriptSummary,
        previous_facts: previousFacts || undefined
      });
      
      const elapsed = Date.now() - startTime;
      console.log(`⏱️  Profile extraction took ${elapsed}ms`);
      
      profileContradictions = contradictions || [];
      
      if (facts) {
        const merged = mergeFacts(previousFacts, facts);
        updateFacts(merged.merged_facts);
        
        if (previousFacts) {
          const programmaticContradictions = compareProfiles(previousFacts, facts);
          profileContradictions = [...profileContradictions, ...programmaticContradictions];
        }
      }
      
      if (profileContradictions.length > 0) {
        console.log(`⚠️  Found ${profileContradictions.length} profile contradiction(s)`);
      }
    } catch (error) {
      console.error('❌ Error in profile extraction:', error);
    }
  }
  
  // Calculer output contradictions
  const allContradictions = [...localContradictions, ...profileContradictions];
  const contradictionOutput = computeContradictionOutput(contradictionScore, allContradictions);
  contradictionScore = contradictionOutput.contradiction_score;
  
  // ============================================
  // 2. SCRIPT TRACKING (seulement pour recruteur)
  // ============================================
  let scriptTrackingResult = null;
  // Track script using BOTH candidate and recruiter transcripts
  // Accumulate chunks from both speakers and combine them for better context
  try {
    // Add current chunk to history for this speaker
    const speakerKey = speaker === 'candidate' ? 'candidate' : 'recruiter';
    scriptChunkHistory[speakerKey].push(transcriptChunk);
    if (scriptChunkHistory[speakerKey].length > MAX_SCRIPT_HISTORY) {
      scriptChunkHistory[speakerKey].shift(); // Remove oldest chunk
    }
    
    // Combine chunks from both speakers for script tracking
    const combinedCandidateChunks = scriptChunkHistory.candidate.join(' ').trim();
    const combinedRecruiterChunks = scriptChunkHistory.recruiter.join(' ').trim();
    
    // Combine both speakers' chunks with speaker labels for context
    let combinedChunk = '';
    if (combinedCandidateChunks && combinedRecruiterChunks) {
      combinedChunk = `[CANDIDATE] ${combinedCandidateChunks} [RECRUITER] ${combinedRecruiterChunks}`;
    } else if (combinedCandidateChunks) {
      combinedChunk = `[CANDIDATE] ${combinedCandidateChunks}`;
    } else if (combinedRecruiterChunks) {
      combinedChunk = `[RECRUITER] ${combinedRecruiterChunks}`;
    } else {
      combinedChunk = transcriptChunk; // Fallback to current chunk only
    }
    
    console.log(`📋 Running script tracking for ${speaker}...`);
    console.log(`   Current chunk: "${transcriptChunk.substring(0, 100)}${transcriptChunk.length > 100 ? '...' : ''}"`);
    console.log(`   Combined context (${scriptChunkHistory.candidate.length} candidate + ${scriptChunkHistory.recruiter.length} recruiter chunks): "${combinedChunk.substring(0, 150)}${combinedChunk.length > 150 ? '...' : ''}"`);
    const startTime = Date.now();
    
    scriptTrackingResult = await processScriptChunk(combinedChunk);
    
    const elapsed = Date.now() - startTime;
    console.log(`⏱️  Script tracking took ${elapsed}ms`);
    
    if (scriptTrackingResult.deviation.deviation) {
      console.log(`⚠️  Script deviation: ${scriptTrackingResult.deviation.type}`);
      console.log(`   ${scriptTrackingResult.deviation.message}`);
    }
    
    console.log(`📊 Script progress: ${scriptTrackingResult.scriptState.progress}%`);
    console.log(`   Current: Section ${scriptTrackingResult.scriptState.currentSection}, Subsection: ${scriptTrackingResult.scriptState.currentSubsection}`);
    console.log(`   Completed sections:`, Object.keys(scriptTrackingResult.scriptState.completedSections).filter(id => scriptTrackingResult.scriptState.completedSections[id]));
    console.log(`   Completed subsections:`, Object.keys(scriptTrackingResult.scriptState.completedSubsections).filter(id => scriptTrackingResult.scriptState.completedSubsections[id]));
  } catch (error) {
    console.error('❌ Error in script tracking:', error);
    console.error('   Stack:', error.stack);
  }
  
  // ============================================
  // 3. CULTURAL FIT (seulement pour candidat)
  // ============================================
  let culturalFitResult = null;
  if (speaker === 'candidate') {
    try {
      console.log('🎯 Running cultural fit evaluation...');
      const startTime = Date.now();
      
      // Préparer l'historique (résumé des chunks précédents)
      const historySummary = recentContext.slice(-10).join(' ').substring(0, 500);
      
      culturalFitResult = await evaluateCulturalFit({
        latest_chunk: transcriptChunk,
        history_summary: historySummary,
        previous_score: culturalFitScore
      });
      
      // Mettre à jour le score
      culturalFitScore = culturalFitResult.cultural_score;
      
      const elapsed = Date.now() - startTime;
      console.log(`⏱️  Cultural fit evaluation took ${elapsed}ms`);
      console.log(`📊 Cultural fit score: ${culturalFitScore.toFixed(1)} (${culturalFitResult.label})`);
      
      if (culturalFitResult.signals.length > 0) {
        console.log(`   Signals: ${culturalFitResult.signals.length} detected`);
      }
    } catch (error) {
      console.error('❌ Error in cultural fit evaluation:', error);
    }
  }
  
  // ============================================
  // 4. COMBINER LES RÉSULTATS
  // ============================================
  const result = {
    contradiction: contradictionOutput,
    scriptTracking: scriptTrackingResult,
    culturalFit: culturalFitResult,
    metadata: {
      chunkNumber: chunkCounter,
      speaker,
      timestamp: Date.now()
    }
  };
  
  // Mettre à jour le contexte
  recentContext.push(transcriptChunk);
  if (recentContext.length > 12) {
    recentContext.shift();
  }
  
  return result;
}

/**
 * Réinitialiser l'état pour une nouvelle interview
 */
export function resetState() {
  contradictionScore = 100;
  culturalFitScore = 50;
  recentContext = [];
  chunkCounter = 0;
  scriptChunkHistory = {
    candidate: [],
    recruiter: []
  };
  resetFacts();
  resetScriptTracker();
  console.log('🔄 All states reset for new interview');
}

