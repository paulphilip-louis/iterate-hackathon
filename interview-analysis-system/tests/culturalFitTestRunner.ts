/**
 * Cultural Fit Test Runner
 * 
 * Test harness that simulates real-time cultural fit evaluation:
 * 1. Loads candidate speech chunks from diarization simulator
 * 2. Processes each chunk sequentially with 1-second delays
 * 3. Calls evaluateCulturalFit() for each chunk
 * 4. Maintains score history and conversation context
 * 5. Logs detailed results for each evaluation
 */

import { evaluateCulturalFit } from '../cultural_fit/culturalFitEvaluator';
import { CulturalFitInput, CulturalFitOutput } from '../cultural_fit/types';
import { getSimulatedCandidateChunks } from './diarizationSimulator';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

/**
 * Sleep utility for simulating real-time delays
 * 
 * @param ms - Milliseconds to wait
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Format signal for display
 * 
 * @param signal - Signal object
 * @returns Formatted string
 */
function formatSignal(signal: { type: string; msg: string }): string {
  const icon = signal.type === 'positive' ? '✅' : '❌';
  return `  ${icon} [${signal.type.toUpperCase()}] ${signal.msg}`;
}

/**
 * Format score with color indicators
 * 
 * @param score - Cultural fit score
 * @returns Formatted score string
 */
function formatScore(score: number): string {
  if (score >= 75) return `🟢 ${score}`;
  if (score >= 50) return `🟡 ${score}`;
  if (score >= 25) return `🟠 ${score}`;
  return `🔴 ${score}`;
}

/**
 * Main test runner
 */
async function runCulturalFitTest(): Promise<void> {
  console.log('🚀 Starting Cultural Fit Detection Simulation');
  console.log('='.repeat(70));
  console.log('');
  
  // Initialize state
  let score = 50; // Starting score (neutral)
  let history: string[] = []; // Conversation history
  let finalResult: CulturalFitOutput | null = null; // Store final result for summary
  const chunks = getSimulatedCandidateChunks();
  
  // Load company values file (mock data)
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  const companyValuesPath = join(__dirname, '..', 'cultural_fit', 'mock_company_values.txt');
  
  console.log(`📋 Using company values from: ${companyValuesPath}`);
  console.log('');
  
  console.log(`📊 Processing ${chunks.length} candidate speech chunks`);
  console.log(`🎯 Starting score: ${formatScore(score)}`);
  console.log('');
  console.log('─'.repeat(70));
  console.log('');
  
  // Process each chunk
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const chunkNumber = i + 1;
    
    console.log(`📝 CHUNK ${chunkNumber}/${chunks.length}`);
    console.log(`💬 Text: "${chunk}"`);
    console.log('');
    
    // Simulate real-time delay (1 second between chunks)
    if (i > 0) {
      console.log('⏳ Waiting 1 second (simulating real-time processing)...');
      await sleep(1000);
    }
    
    // Prepare input
    const historySummary = history.length > 0 
      ? history.slice(-3).join(' ') // Last 3 chunks for context
      : 'No previous conversation history';
    
    const input: CulturalFitInput = {
      latest_chunk: chunk,
      history_summary: historySummary,
      previous_score: score,
      company_values_file_path: companyValuesPath
    };
    
    try {
      console.log('🤖 Calling evaluateCulturalFit()...');
      const startTime = Date.now();
      
      // Call the cultural fit evaluator
      const result: CulturalFitOutput = await evaluateCulturalFit(input);
      
      const duration = Date.now() - startTime;
      
      // Display results
      console.log('');
      console.log('📊 RESULTS:');
      console.log(`  Previous Score: ${formatScore(score)}`);
      console.log(`  New Score: ${formatScore(result.cultural_score)}`);
      console.log(`  Trend: ${result.trend > '0' ? '📈' : result.trend < '0' ? '📉' : '➡️'} ${result.trend}`);
      console.log(`  Label: ${result.label}`);
      console.log(`  Processing Time: ${duration}ms`);
      console.log('');
      
      if (result.signals.length > 0) {
        console.log('🔍 SIGNALS DETECTED:');
        result.signals.forEach(signal => {
          console.log(formatSignal(signal));
        });
      } else {
        console.log('🔍 No signals detected in this chunk');
      }
      
      // Update state
      score = result.cultural_score;
      finalResult = result; // Store for final summary
      history.push(chunk);
      
      // Keep history manageable (last 10 chunks)
      if (history.length > 10) {
        history.shift();
      }
      
    } catch (error) {
      console.error('');
      console.error('❌ ERROR processing chunk:');
      if (error instanceof Error) {
        console.error(`   ${error.message}`);
        if (error.stack) {
          console.error(`   Stack: ${error.stack.split('\n')[1]?.trim()}`);
        }
      } else {
        console.error(`   ${String(error)}`);
      }
      
      // Continue with next chunk even if this one failed
      console.log('');
      console.log('⚠️  Continuing with next chunk...');
    }
    
    console.log('');
    console.log('─'.repeat(70));
    console.log('');
  }
  
  // Final summary
  console.log('='.repeat(70));
  console.log('📈 FINAL SUMMARY');
  console.log('='.repeat(70));
  console.log('');
  console.log(`🎯 Final Cultural Fit Score: ${formatScore(score)}`);
  if (finalResult) {
    console.log(`📊 Label: ${finalResult.label}`);
  }
  console.log(`📝 Total Chunks Processed: ${chunks.length}`);
  console.log('');
  
  // Score trajectory
  console.log('📉 Score Trajectory:');
  console.log(`   Started at: 50 (neutral)`);
  console.log(`   Ended at: ${score}`);
  const totalChange = score - 50;
  const changeIcon = totalChange > 0 ? '📈' : totalChange < 0 ? '📉' : '➡️';
  console.log(`   Net Change: ${changeIcon} ${totalChange > 0 ? '+' : ''}${totalChange}`);
  console.log('');
  
  if (score >= 75) {
    console.log('✅ Result: HIGH FIT - Strong cultural alignment detected');
  } else if (score >= 50) {
    console.log('⚠️  Result: MODERATE FIT - Some concerns, but generally aligned');
  } else if (score >= 25) {
    console.log('⚠️  Result: LOW FIT - Significant cultural misalignment');
  } else {
    console.log('❌ Result: AT RISK - Major cultural fit concerns');
  }
  
  console.log('');
  console.log('✨ Simulation complete!');
  console.log('');
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (error) => {
  console.error('');
  console.error('❌ Unhandled error:', error);
  process.exit(1);
});

// Run the test
runCulturalFitTest().catch((error) => {
  console.error('');
  console.error('❌ Fatal error:', error);
  process.exit(1);
});

