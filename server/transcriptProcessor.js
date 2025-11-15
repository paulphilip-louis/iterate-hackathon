/**
 * Transcript Processor - Orchestrates contradiction detection and sends results to frontend
 * 
 * This file handles:
 * 1. Receiving transcript chunks
 * 2. Calling contradiction detection modules (LLM)
 * 3. Computing output.contradictions
 * 4. Sending results to frontend via WebSocket
 */

import { 
  localContradictionScan, 
  extractProfileFacts, 
  computeContradictionOutput 
} from '../interview-analysis-system/modules/contradiction_detection/index.js';
import { getFacts, updateFacts, resetFacts, mergeFacts } from '../interview-analysis-system/modules/fact_store/index.js';
import { compareProfiles } from '../interview-analysis-system/modules/contradiction_detection/index.js';
import { WebSocket } from 'ws';

// État global pour cette interview
let contradictionScore = 100;
let recentContext = []; // Derniers 12 chunks (2 minutes)
let chunkCounter = 0;

/**
 * ⚠️ FONCTION PRINCIPALE - Appelée à chaque chunk de transcript
 * 
 * @param {string} transcriptChunk - Le chunk de transcript du candidat
 * @param {WebSocketServer} wss - Serveur WebSocket pour envoyer au frontend
 * @returns {Promise<ContradictionOutput>} - Les résultats de détection
 */
export async function processTranscriptChunk(transcriptChunk, wss) {
  chunkCounter++;
  console.log(`\n📝 Processing chunk #${chunkCounter}`);
  
  // 1. LOCAL SCAN (toutes les ~10 secondes = chaque chunk)
  console.log('🔍 Running local contradiction scan...');
  const startLocalScan = Date.now();
  
  let localContradictions = [];
  try {
    localContradictions = await localContradictionScan({
      latest_chunk: transcriptChunk,
      recent_context: recentContext.join(' '),
      previous_score: contradictionScore
    });
    const elapsed = Date.now() - startLocalScan;
    console.log(`⏱️  Local scan took ${elapsed}ms`);
    
    if (localContradictions.length > 0) {
      console.log(`⚠️  Found ${localContradictions.length} local contradiction(s)`);
    } else {
      console.log('✅ No local contradictions detected');
    }
  } catch (error) {
    console.error('❌ Error in local contradiction scan:', error);
  }
  
  // 2. PROFILE EXTRACTION (toutes les 60 secondes = toutes les 6 chunks)
  let profileContradictions = [];
  if (chunkCounter % 6 === 0 || chunkCounter === 1) {
    console.log('📊 Running profile extraction...');
    const startProfileExtraction = Date.now();
    
    try {
      // Récupérer les 5 dernières minutes (30 chunks)
      const transcriptSummary = recentContext.slice(-30).join(' ');
      const previousFacts = getFacts();
      
      const { facts, contradictions } = await extractProfileFacts({
        transcript_summary: transcriptSummary,
        previous_facts: previousFacts || undefined
      });
      
      const elapsed = Date.now() - startProfileExtraction;
      console.log(`⏱️  Profile extraction took ${elapsed}ms`);
      
      profileContradictions = contradictions || [];
      
      if (profileContradictions.length > 0) {
        console.log(`⚠️  Found ${profileContradictions.length} contradiction(s) during extraction`);
      }
      
      // Merge et stocker les faits
      if (facts) {
        const merged = mergeFacts(previousFacts, facts);
        updateFacts(merged.merged_facts);
        
        if (merged.conflicts.length > 0) {
          console.log(`⚠️  Found ${merged.conflicts.length} fact conflict(s) during merge`);
        }
        
        // Vérification programmatique de cohérence
        if (previousFacts) {
          const programmaticContradictions = compareProfiles(previousFacts, facts);
          if (programmaticContradictions.length > 0) {
            console.log(`⚠️  Found ${programmaticContradictions.length} programmatic contradiction(s)`);
            profileContradictions = [...profileContradictions, ...programmaticContradictions];
          }
        }
      }
    } catch (error) {
      console.error('❌ Error in profile extraction:', error);
    }
  }
  
  // 3. COMBINER TOUTES LES CONTRADICTIONS
  const allContradictions = [...localContradictions, ...profileContradictions];
  
  // 4. CALCULER L'OUTPUT FINAL
  const output = computeContradictionOutput(contradictionScore, allContradictions);
  const previousScore = contradictionScore;
  contradictionScore = output.contradiction_score;
  
  // Log results
  if (allContradictions.length > 0) {
    console.log(`\n📊 CONTRADICTION RESULTS:`);
    console.log(`  Previous Score: ${previousScore}`);
    console.log(`  New Score: ${output.contradiction_score}`);
    console.log(`  Trend: ${output.trend}`);
    console.log(`  Label: ${output.label}`);
    console.log(`  Contradictions: ${allContradictions.length}`);
  } else {
    console.log('\n📊 No contradictions detected - score maintained');
  }
  
  // 5. ⚠️ ENVOI AU FRONTEND - C'EST ICI QUE ÇA SE PASSE
  sendToFrontend(wss, output);
  
  // 6. Mettre à jour le contexte (garder les 12 derniers chunks)
  recentContext.push(transcriptChunk);
  if (recentContext.length > 12) {
    recentContext.shift();
  }
  
  return output;
}

/**
 * ⚠️ FONCTION D'ENVOI AU FRONTEND
 * 
 * @param {WebSocketServer} wss - Serveur WebSocket
 * @param {ContradictionOutput} output - Les résultats à envoyer
 */
function sendToFrontend(wss, output) {
  const message = {
    type: 'contradiction_update',
    payload: {
      contradiction_score: output.contradiction_score,
      trend: output.trend,
      label: output.label,
      contradictions: output.contradictions, // ⚠️ ARRAY DE TOUTES LES CONTRADICTIONS
      timestamp: Date.now()
    }
  };
  
  // Envoyer à tous les clients connectés
  let sentCount = 0;
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      try {
        client.send(JSON.stringify(message));
        sentCount++;
      } catch (error) {
        console.error('❌ Error sending to client:', error);
      }
    }
  });
  
  if (sentCount > 0) {
    console.log(`📤 Sent contradiction update to ${sentCount} client(s): ${output.contradictions.length} contradiction(s), score: ${output.contradiction_score}`);
  }
}

/**
 * Réinitialiser l'état pour une nouvelle interview
 */
export function resetState() {
  contradictionScore = 100;
  recentContext = [];
  chunkCounter = 0;
  resetFacts();
  console.log('🔄 Contradiction detection state reset');
}

/**
 * Get current state (for debugging/monitoring)
 */
export function getState() {
  return {
    contradictionScore,
    chunkCounter,
    recentContextLength: recentContext.length,
    facts: getFacts()
  };
}

