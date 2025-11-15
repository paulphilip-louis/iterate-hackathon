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

// État global pour cette interview
let contradictionScore = 100;
let recentContext = [];
let chunkCounter = 0;

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
  if (speaker === 'recruiter') {
    try {
      console.log('📋 Running script tracking...');
      const startTime = Date.now();
      
      scriptTrackingResult = await processScriptChunk(transcriptChunk);
      
      const elapsed = Date.now() - startTime;
      console.log(`⏱️  Script tracking took ${elapsed}ms`);
      
      if (scriptTrackingResult.deviation.deviation) {
        console.log(`⚠️  Script deviation: ${scriptTrackingResult.deviation.type}`);
        console.log(`   ${scriptTrackingResult.deviation.message}`);
      }
      
      console.log(`📊 Script progress: ${scriptTrackingResult.scriptState.progress}%`);
      console.log(`   Current: Section ${scriptTrackingResult.scriptState.currentSection}`);
    } catch (error) {
      console.error('❌ Error in script tracking:', error);
    }
  }
  
  // ============================================
  // 3. COMBINER LES RÉSULTATS
  // ============================================
  const result = {
    contradiction: contradictionOutput,
    scriptTracking: scriptTrackingResult,
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
  recentContext = [];
  chunkCounter = 0;
  resetFacts();
  resetScriptTracker();
  console.log('🔄 All states reset for new interview');
}

