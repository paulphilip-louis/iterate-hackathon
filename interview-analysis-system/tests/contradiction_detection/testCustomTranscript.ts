/**
 * Test runner for custom transcript
 * 
 * Tests the contradiction detection module with a custom transcript
 */

import { localContradictionScan, extractProfileFacts, computeContradictionOutput } from '../../modules/contradiction_detection';
import { compareProfiles } from '../../modules/contradiction_detection';
import { getFacts, updateFacts, resetFacts, mergeFacts } from '../../modules/fact_store';
import { summarizeFactsJSON } from '../../modules/fact_store';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load custom transcript
const transcriptPath = join(__dirname, 'testTranscript.json');
const transcriptData = JSON.parse(readFileSync(transcriptPath, 'utf-8'));

// Extract candidate-only chunks
const chunks = transcriptData
  .filter((entry: any) => entry.speaker === 'candidate')
  .map((entry: any) => entry.text);

// Helper functions for formatting
function formatScore(score: number): string {
  if (score >= 75) return `🟢 ${score}`;
  if (score >= 50) return `🟡 ${score}`;
  if (score >= 25) return `🟠 ${score}`;
  return `🔴 ${score}`;
}

function formatTrend(trend: string): string {
  if (trend.startsWith('+')) return `📈 ${trend}`;
  if (trend.startsWith('-')) return `📉 ${trend}`;
  return `➡️ ${trend}`;
}

function formatLabel(label: string): string {
  const labels: { [key: string]: string } = {
    'Consistent': '🟢 Consistent',
    'Some Inconsistencies': '🟡 Some Inconsistencies',
    'High Risk': '🟠 High Risk',
    'Severely Contradictory': '🔴 Severely Contradictory'
  };
  return labels[label] || label;
}

function formatSeverity(severity: string): string {
  const icons: { [key: string]: string } = {
    'minor': '⚪',
    'medium': '🟡',
    'major': '🟠',
    'red_flag': '🔴'
  };
  return `${icons[severity] || '•'} ${severity}`;
}

async function runCustomTest(): Promise<void> {
  console.log('🚀 Starting Contradiction Detection Test with Custom Transcript');
  console.log('='.repeat(70));
  console.log('');

  // Initialize
  resetFacts();
  let contradictionScore = 100; // Start at 100 (no contradictions)
  const recentContext: string[] = []; // Last 2 minutes of chunks
  let allDetectedContradictions: any[] = [];

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    
    console.log(`\n📝 CHUNK ${i + 1}/${chunks.length}:`);
    console.log(`   "${chunk.substring(0, 100)}${chunk.length > 100 ? '...' : ''}"`);
    console.log('─'.repeat(70));

    // Update recent context (last 2 minutes = last ~12 chunks, assuming ~10s per chunk)
    recentContext.push(chunk);
    if (recentContext.length > 12) {
      recentContext.shift();
    }
    const recentContextSummary = recentContext.slice(0, -1).join(' '); // Exclude current chunk

    // 1. LOCAL SCAN (every chunk)
    let localContradictions: any[] = [];
    try {
      console.log('\n🔍 Running local contradiction scan...');
      const startTime = Date.now();
      
      localContradictions = await localContradictionScan({
        latest_chunk: chunk,
        recent_context: recentContextSummary,
        previous_score: contradictionScore
      });
      
      const elapsed = Date.now() - startTime;
      console.log(`⏱️  Local scan took ${elapsed}ms`);
      
      if (localContradictions.length > 0) {
        console.log(`⚠️  Found ${localContradictions.length} local contradiction(s):`);
        localContradictions.forEach((c, idx) => {
          console.log(`   ${idx + 1}. [${formatSeverity(c.severity)}] ${c.msg}`);
          if (c.field) console.log(`      Field: ${c.field}`);
        });
      } else {
        console.log('✅ No local contradictions detected');
      }
    } catch (error) {
      console.error('Error in local contradiction scan:', error);
    }

    // 2. PROFILE EXTRACTION (every 6 chunks or last chunk)
    let profileContradictions: any[] = [];
    if ((i + 1) % 6 === 0 || i === chunks.length - 1) {
      try {
        console.log('\n📊 Running profile extraction...');
        const startTime = Date.now();
        
        // Get last 5 minutes of transcript (last ~30 chunks)
        const transcriptWindow = chunks.slice(Math.max(0, i - 29), i + 1);
        const transcriptSummary = transcriptWindow.join(' ');
        
        const previousFacts = getFacts();
        const previousFactsSummary = previousFacts 
          ? summarizeFactsJSON(previousFacts)
          : undefined;
        
        const { facts: extractedFacts, contradictions: extractionContradictions } = 
          await extractProfileFacts({
            transcript_summary: transcriptSummary,
            previous_facts: previousFacts || undefined
          });
        
        const elapsed = Date.now() - startTime;
        console.log(`⏱️  Profile extraction took ${elapsed}ms`);
        
        if (extractionContradictions && extractionContradictions.length > 0) {
          console.log(`⚠️  Found ${extractionContradictions.length} contradiction(s) during extraction:`);
          extractionContradictions.forEach((c, idx) => {
            console.log(`   ${idx + 1}. [${formatSeverity(c.severity)}] ${c.msg}`);
            if (c.field) console.log(`      Field: ${c.field}`);
          });
          profileContradictions = extractionContradictions;
        }
        
        // Merge and store facts
        if (extractedFacts) {
          const merged = mergeFacts(previousFacts, extractedFacts);
          updateFacts(merged.merged_facts);
          
          if (merged.conflicts.length > 0) {
            console.log(`⚠️  Found ${merged.conflicts.length} fact conflict(s) during merge`);
          }
        }
        
        // Programmatic consistency check
        if (previousFacts && extractedFacts) {
          const programmaticContradictions = await compareProfiles(previousFacts, extractedFacts);
          if (programmaticContradictions.length > 0) {
            console.log(`⚠️  Found ${programmaticContradictions.length} programmatic contradiction(s):`);
            programmaticContradictions.forEach((c, idx) => {
              console.log(`   ${idx + 1}. [${formatSeverity(c.severity)}] ${c.msg}`);
              if (c.field) console.log(`      Field: ${c.field}`);
            });
            profileContradictions = [...profileContradictions, ...programmaticContradictions];
          }
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
          if (currentFacts.leadership_experience?.length) {
            console.log(`   Leadership: ${currentFacts.leadership_experience.join(', ')}`);
          }
        }
      } catch (error) {
        console.error('Error in profile extraction:', error);
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
      const previousScore = contradictionScore; // Save previous score before updating
      const output = computeContradictionOutput(contradictionScore, allContradictions);
      contradictionScore = output.contradiction_score;

      console.log('\n📊 CONTRADICTION RESULTS:');
      console.log(`  Previous Score: ${formatScore(previousScore)}`);
      console.log(`  New Score: ${formatScore(output.contradiction_score)}`);
      console.log(`  Trend: ${formatTrend(output.trend)}`);
      console.log(`  Label: ${formatLabel(output.label)}`);
      console.log(`  Contradictions in this chunk: ${allContradictions.length}`);
    } else {
      console.log('\n📊 No contradictions detected - score maintained');
    }
    
    // Simulate real-time delay
    await new Promise(resolve => setTimeout(resolve, 1000));
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

  // Group contradictions by severity for final display
  const bySeverity: { [key: string]: any[] } = {
    minor: [],
    medium: [],
    major: [],
    red_flag: []
  };

  allDetectedContradictions.forEach(c => {
    if (bySeverity[c.severity]) {
      bySeverity[c.severity].push(c);
    }
  });

  if (allDetectedContradictions.length > 0) {
    console.log('📋 Contradictions by Severity:');
    Object.entries(bySeverity).forEach(([severity, list]) => {
      if (list.length > 0) {
        console.log(`\n   ${formatSeverity(severity)}: ${list.length} contradiction(s)`);
        list.forEach((c, idx) => {
          console.log(`      ${idx + 1}. [Chunk ${c.chunk_number}] ${c.msg}`);
          if (c.field) console.log(`         Field: ${c.field}`);
        });
      }
    });
  } else {
    console.log('✅ No contradictions detected throughout the interview!');
  }

  const finalFacts = getFacts();
  if (finalFacts) {
    console.log('\n📋 Final Extracted Profile:');
    if (finalFacts.years_experience !== undefined && finalFacts.years_experience !== null) {
      console.log(`   Experience: ${finalFacts.years_experience} years`);
    }
    if (finalFacts.job_titles?.length) {
      console.log(`   Job titles: ${finalFacts.job_titles.join(', ')}`);
    }
    if (finalFacts.companies?.length) {
      console.log(`   Companies: ${finalFacts.companies.join(', ')}`);
    }
    if (finalFacts.degrees?.length) {
      console.log(`   Education: ${finalFacts.degrees.join(', ')}`);
    }
    if (finalFacts.tech_stack?.length) {
      console.log(`   Tech stack: ${finalFacts.tech_stack.join(', ')}`);
    }
    if (finalFacts.languages?.length) {
      console.log(`   Languages: ${finalFacts.languages.join(', ')}`);
    }
    if (finalFacts.leadership_experience?.length) {
      console.log(`   Leadership: ${finalFacts.leadership_experience.join(', ')}`);
    }
  }
  console.log('');
  console.log('✨ Test complete!');
}

// Run the test
runCustomTest().catch(console.error);

