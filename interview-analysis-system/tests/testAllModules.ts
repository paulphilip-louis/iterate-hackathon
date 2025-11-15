/**
 * Test All Modules - Unified Test Runner
 * 
 * Tests all three modules:
 * 1. Cultural Fit Detection
 * 2. Contradiction Detection
 * 3. Script Tracking
 */

import { evaluateCulturalFit } from '../modules/cultural_fit/index.js';
import { localContradictionScan, extractProfileFacts, computeContradictionOutput } from '../modules/contradiction_detection/index.js';
import { processTranscriptChunk as processScriptChunk, resetScriptTracker } from '../modules/script_tracking/index.js';
import { getFacts, resetFacts, updateFacts, mergeFacts } from '../modules/fact_store/index.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Test scenarios
const TEST_CHUNKS = [
  {
    name: 'Chunk 1 - Personal Introduction',
    chunk: "Bonjour, je m'appelle Jean Dupont. J'ai 32 ans et je suis développeur full-stack depuis 8 ans. J'ai commencé ma carrière dans une startup parisienne.",
    speaker: 'candidate',
    expectedSection: 1
  },
  {
    name: 'Chunk 2 - Professional Background',
    chunk: "Mon parcours professionnel a été assez linéaire. J'ai d'abord travaillé 3 ans dans une startup, puis j'ai rejoint une scale-up où j'ai évolué de développeur à lead developer.",
    speaker: 'candidate',
    expectedSection: 1
  },
  {
    name: 'Chunk 3 - Company Fit (Positive)',
    chunk: "Je connais bien votre entreprise. J'apprécie particulièrement votre approche de l'innovation et votre culture d'entreprise. Je pense que mes valeurs s'alignent bien avec les vôtres.",
    speaker: 'candidate',
    expectedSection: 2
  },
  {
    name: 'Chunk 4 - Blame Shifting (Negative Cultural Fit)',
    chunk: "Vous savez, dans mon dernier projet, il y a eu un problème mais ce n'était pas de ma faute. C'était vraiment l'équipe qui n'a pas bien communiqué. Je n'aurais pas dû être tenu responsable.",
    speaker: 'candidate',
    expectedSection: 4
  },
  {
    name: 'Chunk 5 - Contradiction (Years of Experience)',
    chunk: "En fait, j'ai environ 3 ans d'expérience réelle en backend. Avant ça, j'étais surtout en frontend.",
    speaker: 'candidate',
    expectedSection: 3
  },
  {
    name: 'Chunk 6 - Technical Skills',
    chunk: "Sur le plan technique, je maîtrise React, TypeScript, Node.js, et j'ai de l'expérience avec les architectures microservices.",
    speaker: 'candidate',
    expectedSection: 3
  },
  {
    name: 'Chunk 7 - Recruiter: Script Section 1',
    chunk: "Parfait, merci pour cette introduction. Maintenant, pouvez-vous nous parler de votre parcours professionnel et de ce qui vous motive dans votre carrière ?",
    speaker: 'recruiter',
    expectedSection: 1
  },
  {
    name: 'Chunk 8 - Off-Script Topic',
    chunk: "Ah, vous savez, j'adore le football. Je joue tous les weekends avec mes amis. C'est vraiment ma passion en dehors du travail.",
    speaker: 'candidate',
    expectedSection: null,
    isOffScript: true
  }
];

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function formatScore(score: number, type: 'cultural' | 'contradiction'): string {
  if (score >= 75) return `🟢 ${score}`;
  if (score >= 50) return `🟡 ${score}`;
  if (score >= 25) return `🟠 ${score}`;
  return `🔴 ${score}`;
}

async function testAllModules() {
  console.log('\n' + '='.repeat(80));
  console.log('🧪 TESTING ALL MODULES');
  console.log('='.repeat(80));
  console.log('\nModules to test:');
  console.log('  1. ✅ Cultural Fit Detection');
  console.log('  2. ✅ Contradiction Detection');
  console.log('  3. ✅ Script Tracking');
  console.log('\n' + '='.repeat(80) + '\n');

  // Reset all states
  resetFacts();
  resetScriptTracker();
  let contradictionScore = 100;
  let culturalFitScore = 50;
  let recentContext: string[] = [];
  let chunkCounter = 0;

  const companyValuesPath = join(__dirname, '../modules/cultural_fit/mock_company_values.txt');

  for (let i = 0; i < TEST_CHUNKS.length; i++) {
    const test = TEST_CHUNKS[i];
    chunkCounter++;
    
    console.log(`\n${'─'.repeat(80)}`);
    console.log(`📝 Test ${chunkCounter}/${TEST_CHUNKS.length}: ${test.name}`);
    console.log(`${'─'.repeat(80)}`);
    console.log(`💬 Chunk: "${test.chunk.substring(0, 80)}${test.chunk.length > 80 ? '...' : ''}"`);
    console.log(`👤 Speaker: ${test.speaker}`);

    try {
      // ============================================
      // 1. CULTURAL FIT DETECTION
      // ============================================
      console.log(`\n🎯 1. CULTURAL FIT DETECTION`);
      console.log('   Processing...');
      const startTime = Date.now();
      
      const culturalFitResult = await evaluateCulturalFit({
        latest_chunk: test.chunk,
        history_summary: recentContext.slice(-5).join(' '),
        previous_score: culturalFitScore,
        company_values_file_path: companyValuesPath
      });
      
      const elapsed = Date.now() - startTime;
      culturalFitScore = culturalFitResult.cultural_score;
      
      console.log(`   ⏱️  Time: ${elapsed}ms`);
      console.log(`   📊 Score: ${formatScore(culturalFitResult.cultural_score, 'cultural')} (${culturalFitResult.trend})`);
      console.log(`   🏷️  Label: ${culturalFitResult.label}`);
      
      if (culturalFitResult.signals && culturalFitResult.signals.length > 0) {
        console.log(`   📡 Signals (${culturalFitResult.signals.length}):`);
        culturalFitResult.signals.slice(0, 3).forEach(signal => {
          const icon = signal.type === 'positive' ? '✅' : '❌';
          console.log(`      ${icon} ${signal.msg.substring(0, 60)}${signal.msg.length > 60 ? '...' : ''}`);
        });
      }

      // ============================================
      // 2. CONTRADICTION DETECTION
      // ============================================
      console.log(`\n🔍 2. CONTRADICTION DETECTION`);
      console.log('   Processing...');
      const startTime2 = Date.now();
      
      const localContradictions = await localContradictionScan({
        latest_chunk: test.chunk,
        recent_context: recentContext.join(' '),
        previous_score: contradictionScore
      });
      
      // Profile extraction every 6 chunks
      let profileContradictions: any[] = [];
      if (chunkCounter % 6 === 0 || chunkCounter === 1) {
        console.log('   📊 Running profile extraction...');
        const transcriptSummary = recentContext.slice(-30).join(' ');
        const previousFacts = getFacts();
        
        const { facts, contradictions } = await extractProfileFacts({
          transcript_summary: transcriptSummary || test.chunk,
          previous_facts: previousFacts || undefined
        });
        
        profileContradictions = contradictions || [];
        
        if (facts) {
          const merged = mergeFacts(previousFacts, facts);
          updateFacts(merged.merged_facts);
        }
      }
      
      const allContradictions = [...localContradictions, ...profileContradictions];
      const contradictionOutput = computeContradictionOutput(contradictionScore, allContradictions);
      contradictionScore = contradictionOutput.contradiction_score;
      
      const elapsed2 = Date.now() - startTime2;
      
      console.log(`   ⏱️  Time: ${elapsed2}ms`);
      console.log(`   📊 Score: ${formatScore(contradictionOutput.contradiction_score, 'contradiction')} (${contradictionOutput.trend})`);
      console.log(`   🏷️  Label: ${contradictionOutput.label}`);
      
      if (contradictionOutput.contradictions && contradictionOutput.contradictions.length > 0) {
        console.log(`   ⚠️  Contradictions (${contradictionOutput.contradictions.length}):`);
        contradictionOutput.contradictions.slice(0, 2).forEach(cont => {
          const severityEmoji: Record<string, string> = {
            'minor': '⚪',
            'medium': '🟡',
            'major': '🟠',
            'red_flag': '🔴'
          };
          const emoji = severityEmoji[cont.severity] || '⚠️';
          console.log(`      ${emoji} [${cont.severity}] ${cont.msg.substring(0, 60)}${cont.msg.length > 60 ? '...' : ''}`);
        });
      }

      // ============================================
      // 3. SCRIPT TRACKING (only for recruiter)
      // ============================================
      if (test.speaker === 'recruiter') {
        console.log(`\n📋 3. SCRIPT TRACKING`);
        console.log('   Processing...');
        const startTime3 = Date.now();
        
        const scriptResult = await processScriptChunk(test.chunk);
        
        const elapsed3 = Date.now() - startTime3;
        
        console.log(`   ⏱️  Time: ${elapsed3}ms`);
        console.log(`   📊 Section: ${scriptResult.llm.section || 'N/A'} (confidence: ${(scriptResult.llm.confidence * 100).toFixed(1)}%)`);
        console.log(`   📝 Subsection: ${scriptResult.llm.subsection || 'N/A'}`);
        console.log(`   🚫 Off-script: ${scriptResult.llm.isOffScript ? 'Yes' : 'No'}`);
        
        if (scriptResult.deviation.deviation) {
          console.log(`   ⚠️  Deviation: ${scriptResult.deviation.type} - ${scriptResult.deviation.message}`);
        } else {
          console.log(`   ✅ No deviation`);
        }
        
        console.log(`   📈 Progress: ${scriptResult.scriptState.progress}%`);
      } else {
        console.log(`\n📋 3. SCRIPT TRACKING`);
        console.log('   ⏭️  Skipped (candidate speech)');
      }

      // Update context
      recentContext.push(test.chunk);
      if (recentContext.length > 12) {
        recentContext.shift();
      }

      // Small delay between tests
      await sleep(500);

    } catch (error) {
      console.error(`\n❌ Error processing chunk:`, error);
      if (error instanceof Error) {
        console.error(`   Message: ${error.message}`);
      }
    }
  }

  console.log(`\n${'='.repeat(80)}`);
  console.log('✅ ALL TESTS COMPLETED!');
  console.log(`${'='.repeat(80)}\n`);
  
  // Final summary
  console.log('📊 FINAL SUMMARY:');
  console.log(`   Cultural Fit Score: ${formatScore(culturalFitScore, 'cultural')}`);
  console.log(`   Contradiction Score: ${formatScore(contradictionScore, 'contradiction')}`);
  console.log(`   Total Chunks Processed: ${chunkCounter}`);
  console.log();
}

// Run tests
testAllModules().catch(error => {
  console.error('❌ Test runner failed:', error);
  process.exit(1);
});

