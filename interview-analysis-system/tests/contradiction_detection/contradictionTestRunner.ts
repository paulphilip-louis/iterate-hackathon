/**
 * Test runner for contradiction detection module
 * 
 * Simulates real-time contradiction detection:
 * - Local scan every chunk
 * - Profile extraction every 6 chunks
 * - Updates score dynamically
 */

import { localContradictionScan, extractProfileFacts, computeContradictionOutput } from '../../modules/contradiction_detection';
import { compareProfiles } from '../../modules/contradiction_detection';
import { getFacts, updateFacts, resetFacts, mergeFacts } from '../../modules/fact_store';
import { getSimulatedCandidateChunks, getTranscriptWindows, summarizeChunks } from './diarizationSimulator';
import { LocalScanInput, Contradiction } from '../../modules/contradiction_detection/types';

// Helper functions for formatting
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function formatScore(score: number): string {
  if (score >= 75) return `🟢 ${score}`;
  if (score >= 50) return `🟡 ${score}`;
  if (score >= 25) return `🟠 ${score}`;
  return `🔴 ${score}`;
}

function formatTrend(trend: string): string {
  const num = parseInt(trend);
  if (num > 0) return `📈 +${num}`;
  if (num < 0) return `📉 ${num}`;
  return `➡️ 0`;
}

function formatLabel(label: string): string {
  const labels: Record<string, string> = {
    'Consistent': '🟢 Consistent',
    'Some Inconsistencies': '🟡 Some Inconsistencies',
    'High Risk': '🟠 High Risk',
    'Severely Contradictory': '🔴 Severely Contradictory'
  };
  return labels[label] || label;
}

function formatContradiction(contradiction: Contradiction): string {
  const severityEmoji: Record<string, string> = {
    'minor': '⚪',
    'medium': '🟡',
    'major': '🟠',
    'red_flag': '🔴'
  };
  const emoji = severityEmoji[contradiction.severity] || '⚪';
  return `${emoji} [${contradiction.severity.toUpperCase()}] ${contradiction.msg}`;
}

async function runContradictionTest(): Promise<void> {
  console.log('🚀 Starting Contradiction Detection Simulation');
  console.log('='.repeat(70));
  console.log('');
  
  // Initialize
  resetFacts();
  let contradictionScore = 100; // Start at 100 (perfect consistency)
  const chunks = getSimulatedCandidateChunks();
  const windows = getTranscriptWindows(6); // 6 chunks per window for profile extraction
  
  // Track recent context for local scan (last 2 minutes = ~6 chunks)
  const recentContext: string[] = [];
  
  // Store all detected contradictions for final summary
  const allDetectedContradictions: Contradiction[] = [];
  
  console.log(`📊 Processing ${chunks.length} candidate speech chunks`);
  console.log(`🎯 Starting score: ${formatScore(contradictionScore)}`);
  console.log(`📋 Profile extraction will run every 6 chunks`);
  console.log('');
  console.log('─'.repeat(70));

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    console.log(`\n📝 CHUNK ${i + 1}/${chunks.length}`);
    console.log(`💬 Text: "${chunk}"`);
    
    if (i > 0) {
      console.log('⏳ Waiting 1 second (simulating real-time processing)...');
      await sleep(1000);
    }
    
    // Update recent context (keep last 6 chunks)
    recentContext.push(chunk);
    if (recentContext.length > 6) {
      recentContext.shift();
    }
    
    const recentContextSummary = recentContext.slice(0, -1).join(' '); // Exclude current chunk
    
    // Debug: show what context is being used
    if (i === 8) { // Show for chunk 9 to debug
      console.log(`\n🔍 DEBUG - Recent context (${recentContext.slice(0, -1).length} chunks):`);
      console.log(`   "${recentContextSummary.substring(0, 200)}${recentContextSummary.length > 200 ? '...' : ''}"`);
    }
    
    // 1. LOCAL SCAN (every chunk)
    console.log('\n🔍 Running local contradiction scan...');
    const localScanInput: LocalScanInput = {
      latest_chunk: chunk,
      recent_context: recentContextSummary || 'No previous context',
      previous_score: contradictionScore
    };
    
    let localContradictions: Contradiction[] = [];
    try {
      const startTime = Date.now();
      localContradictions = await localContradictionScan(localScanInput);
      const processingTime = Date.now() - startTime;
      console.log(`⏱️  Local scan took ${processingTime}ms`);
      
      if (localContradictions.length > 0) {
        console.log(`⚠️  Found ${localContradictions.length} local contradiction(s):`);
        localContradictions.forEach(c => console.log(`   ${formatContradiction(c)}`));
      } else {
        console.log('✅ No local contradictions detected');
      }
    } catch (error) {
      console.error('❌ Error in local scan:', error);
    }
    
    // 2. PROFILE EXTRACTION (every 6 chunks)
    let profileContradictions: Contradiction[] = [];
    if ((i + 1) % 6 === 0 || i === chunks.length - 1) {
      console.log('\n📋 Running profile extraction...');
      
      // Get last 6 chunks for profile extraction
      const profileWindow = chunks.slice(Math.max(0, i - 5), i + 1);
      const transcriptSummary = summarizeChunks(profileWindow);
      
      try {
        const startTime = Date.now();
        const previousFacts = getFacts();
        const profileResult = await extractProfileFacts({
          transcript_summary: transcriptSummary,
          previous_facts: previousFacts || undefined
        });
        const processingTime = Date.now() - startTime;
        console.log(`⏱️  Profile extraction took ${processingTime}ms`);
        
        // Merge facts
        if (previousFacts) {
          const mergeResult = mergeFacts(previousFacts, profileResult.facts);
          updateFacts(mergeResult.merged_facts);
          
          // Check for consistency
          const consistencyContradictions = await compareProfiles(previousFacts, profileResult.facts);
          profileContradictions = [
            ...profileResult.contradictions,
            ...consistencyContradictions
          ];
        } else {
          updateFacts(profileResult.facts);
          profileContradictions = profileResult.contradictions;
        }
        
        if (profileContradictions.length > 0) {
          console.log(`⚠️  Found ${profileContradictions.length} profile contradiction(s):`);
          profileContradictions.forEach(c => console.log(`   ${formatContradiction(c)}`));
        } else {
          console.log('✅ No profile contradictions detected');
        }
        
        // Display extracted facts (show ALL stored facts, not just new ones)
        const currentFacts = getFacts();
        if (currentFacts) {
          console.log('\n📊 Current stored facts (ALL accumulated):');
          if (currentFacts.years_experience !== undefined && currentFacts.years_experience !== null) {
            console.log(`   Experience: ${currentFacts.years_experience} years`);
          }
          if (currentFacts.job_titles?.length) {
            console.log(`   Job titles: ${currentFacts.job_titles.join(', ')}`);
          }
          if (currentFacts.companies?.length) {
            console.log(`   Companies: ${currentFacts.companies.join(', ')}`);
          }
          if (currentFacts.degrees?.length) {
            console.log(`   Education: ${currentFacts.degrees.join(', ')}`);
          }
          if (currentFacts.tech_stack?.length) {
            console.log(`   Tech stack: ${currentFacts.tech_stack.join(', ')}`);
          }
          if (currentFacts.languages?.length) {
            console.log(`   Languages: ${currentFacts.languages.join(', ')}`);
          }
        }
      } catch (error) {
        console.error('❌ Error in profile extraction:', error);
      }
    }
    
    // 3. COMBINE ALL CONTRADICTIONS AND UPDATE SCORE
    const allContradictions = [...localContradictions, ...profileContradictions];
    
    // Store all contradictions for final summary
    if (allContradictions.length > 0) {
      allDetectedContradictions.push(...allContradictions.map(c => ({
        ...c,
        chunk_number: i + 1 // Track which chunk this was detected in
      })));
    }
    
    if (allContradictions.length > 0) {
      // Save previous score before updating
      const previousScore = contradictionScore;
      const output = computeContradictionOutput(contradictionScore, allContradictions);
      contradictionScore = output.contradiction_score;
      
      console.log('\n📊 CONTRADICTION RESULTS:');
      console.log(`  Previous Score: ${formatScore(previousScore)}`);
      console.log(`  New Score: ${formatScore(output.contradiction_score)}`);
      console.log(`  Trend: ${formatTrend(output.trend)}`);
      console.log(`  Label: ${formatLabel(output.label)}`);
      console.log(`  Contradictions in this chunk: ${allContradictions.length}`);
    } else {
      // No contradictions, score stays the same (or slightly improves)
      console.log('\n📊 No contradictions detected - score maintained');
    }
    
    console.log('');
    console.log('─'.repeat(70));
  }

  // Final summary
  console.log('\n' + '='.repeat(70));
  console.log('📈 FINAL SUMMARY');
  console.log('='.repeat(70));
  console.log('');
  console.log(`🎯 Final Contradiction Score: ${formatScore(contradictionScore)}`);
  console.log(`📝 Total Chunks Processed: ${chunks.length}`);
  console.log(`⚠️  Total Contradictions Detected: ${allDetectedContradictions.length}`);
  console.log('');
  
  // Group contradictions by severity
  const bySeverity = {
    minor: allDetectedContradictions.filter(c => c.severity === 'minor'),
    medium: allDetectedContradictions.filter(c => c.severity === 'medium'),
    major: allDetectedContradictions.filter(c => c.severity === 'major'),
    red_flag: allDetectedContradictions.filter(c => c.severity === 'red_flag')
  };
  
  if (allDetectedContradictions.length > 0) {
    console.log('🔍 ALL DETECTED CONTRADICTIONS:');
    console.log('');
    
    if (bySeverity.red_flag.length > 0) {
      console.log(`🔴 RED FLAGS (${bySeverity.red_flag.length}):`);
      bySeverity.red_flag.forEach((c, idx) => {
        const chunkNum = (c as any).chunk_number || '?';
        console.log(`   ${idx + 1}. [Chunk ${chunkNum}] ${c.msg}`);
      });
      console.log('');
    }
    
    if (bySeverity.major.length > 0) {
      console.log(`🟠 MAJOR (${bySeverity.major.length}):`);
      bySeverity.major.forEach((c, idx) => {
        const chunkNum = (c as any).chunk_number || '?';
        console.log(`   ${idx + 1}. [Chunk ${chunkNum}] ${c.msg}`);
      });
      console.log('');
    }
    
    if (bySeverity.medium.length > 0) {
      console.log(`🟡 MEDIUM (${bySeverity.medium.length}):`);
      bySeverity.medium.forEach((c, idx) => {
        const chunkNum = (c as any).chunk_number || '?';
        console.log(`   ${idx + 1}. [Chunk ${chunkNum}] ${c.msg}`);
      });
      console.log('');
    }
    
    if (bySeverity.minor.length > 0) {
      console.log(`⚪ MINOR (${bySeverity.minor.length}):`);
      bySeverity.minor.forEach((c, idx) => {
        const chunkNum = (c as any).chunk_number || '?';
        console.log(`   ${idx + 1}. [Chunk ${chunkNum}] ${c.msg}`);
      });
      console.log('');
    }
  } else {
    console.log('✅ No contradictions detected throughout the interview');
    console.log('');
  }
  
  const finalFacts = getFacts();
  if (finalFacts) {
    console.log('📋 Final Extracted Facts:');
    if (finalFacts.years_experience) console.log(`   Experience: ${finalFacts.years_experience} years`);
    if (finalFacts.job_titles?.length) console.log(`   Job titles: ${finalFacts.job_titles.join(', ')}`);
    if (finalFacts.companies?.length) console.log(`   Companies: ${finalFacts.companies.join(', ')}`);
    if (finalFacts.degrees?.length) console.log(`   Education: ${finalFacts.degrees.join(', ')}`);
    if (finalFacts.tech_stack?.length) console.log(`   Tech stack: ${finalFacts.tech_stack.join(', ')}`);
  }
  
  console.log('');
  console.log('✨ Simulation complete!');
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}` || 
    process.argv[1]?.includes('contradictionTestRunner.ts')) {
  runContradictionTest().catch(console.error);
}

