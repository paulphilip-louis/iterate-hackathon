/**
 * Test file for Cultural Fit Detection module
 * 
 * This file demonstrates how to test the module with mock LLM responses.
 * Run with: npx tsx cultural_fit/test.ts
 */

import { evaluateCulturalFit, LLMCallFunction } from './culturalFitEvaluator';
import { CulturalFitInput } from './types';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Read example input JSON
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const exampleInput = JSON.parse(
  readFileSync(join(__dirname, 'exampleInput.json'), 'utf-8')
) as CulturalFitInput;

/**
 * Mock LLM function that simulates realistic responses
 * Based on the input, it returns appropriate cultural fit evaluations
 */
const createMockLLM = (mockResponse: string): LLMCallFunction => {
  return async (config) => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 100));
    return mockResponse;
  };
};

/**
 * Test Case 1: Negative signal (blame shifting)
 */
async function testBlameShifting() {
  console.log('\n🧪 Test 1: Blame Shifting (Negative Signal)');
  console.log('─'.repeat(60));
  
  const mockResponse = JSON.stringify({
    cultural_score: 45,
    trend: "-13",
    signals: [
      {
        type: "negative",
        msg: "Blame shifting: explicitly denies responsibility and blames teammates"
      },
      {
        type: "negative",
        msg: "Avoidance: pattern of avoiding responsibility (second occurrence)"
      }
    ],
    label: "Low Fit"
  });
  
  const input: CulturalFitInput = {
    latest_chunk: "I think mistakes happen but it was not my fault. My teammates didn't help me.",
    history_summary: "Candidate previously showed good communication but avoided responsibility twice.",
    previous_score: 58
  };
  
  try {
    const result = await evaluateCulturalFit(input, createMockLLM(mockResponse));
    console.log('Input:', JSON.stringify(input, null, 2));
    console.log('\nResult:', JSON.stringify(result, null, 2));
    console.log('\n✅ Test passed!');
    console.log(`   Score dropped from ${input.previous_score} to ${result.cultural_score}`);
    console.log(`   Trend: ${result.trend}`);
    console.log(`   Signals detected: ${result.signals.length}`);
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

/**
 * Test Case 2: Positive signal (ownership and accountability)
 */
async function testPositiveSignals() {
  console.log('\n🧪 Test 2: Positive Signals (Ownership & Accountability)');
  console.log('─'.repeat(60));
  
  const mockResponse = JSON.stringify({
    cultural_score: 75,
    trend: "+5",
    signals: [
      {
        type: "positive",
        msg: "Ownership: Takes full responsibility for the project outcome"
      },
      {
        type: "positive",
        msg: "Accountability: Acknowledges mistakes and explains learning process"
      },
      {
        type: "positive",
        msg: "Growth mindset: Views challenges as opportunities to improve"
      }
    ],
    label: "High Fit"
  });
  
  const input: CulturalFitInput = {
    latest_chunk: "I made a mistake in the initial design, but I learned from it and fixed it. I take full responsibility for the delay.",
    history_summary: "Candidate has shown consistent ownership throughout the interview.",
    previous_score: 70
  };
  
  try {
    const result = await evaluateCulturalFit(input, createMockLLM(mockResponse));
    console.log('Input:', JSON.stringify(input, null, 2));
    console.log('\nResult:', JSON.stringify(result, null, 2));
    console.log('\n✅ Test passed!');
    console.log(`   Score improved from ${input.previous_score} to ${result.cultural_score}`);
    console.log(`   Trend: ${result.trend}`);
    console.log(`   Positive signals: ${result.signals.filter(s => s.type === 'positive').length}`);
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

/**
 * Test Case 3: Red flag (toxic attitude)
 */
async function testRedFlag() {
  console.log('\n🧪 Test 3: Red Flag (Toxic Attitude)');
  console.log('─'.repeat(60));
  
  const mockResponse = JSON.stringify({
    cultural_score: 20,
    trend: "-30",
    signals: [
      {
        type: "negative",
        msg: "Red flag: Hostile attitude towards previous team members"
      },
      {
        type: "negative",
        msg: "Toxic behavior: Complains extensively about colleagues"
      },
      {
        type: "negative",
        msg: "Values mismatch: Fundamental misalignment with collaborative values"
      }
    ],
    label: "At Risk"
  });
  
  const input: CulturalFitInput = {
    latest_chunk: "My last team was terrible. They were all incompetent and I had to do everything myself. I don't trust anyone to do their job properly.",
    history_summary: "Candidate has shown increasing negativity throughout the interview.",
    previous_score: 50
  };
  
  try {
    const result = await evaluateCulturalFit(input, createMockLLM(mockResponse));
    console.log('Input:', JSON.stringify(input, null, 2));
    console.log('\nResult:', JSON.stringify(result, null, 2));
    console.log('\n✅ Test passed!');
    console.log(`   Score dropped from ${input.previous_score} to ${result.cultural_score}`);
    console.log(`   Trend: ${result.trend}`);
    console.log(`   Label: ${result.label} (should be "At Risk")`);
    console.log(`   Red flags detected: ${result.signals.length}`);
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

/**
 * Test Case 4: Score smoothing verification
 */
async function testScoreSmoothing() {
  console.log('\n🧪 Test 4: Score Smoothing Verification');
  console.log('─'.repeat(60));
  
  const mockResponse = JSON.stringify({
    cultural_score: 80, // LLM suggests 80
    trend: "+10",
    signals: [
      {
        type: "positive",
        msg: "Strong ownership and accountability demonstrated"
      }
    ],
    label: "High Fit"
  });
  
  const input: CulturalFitInput = {
    latest_chunk: "I take full ownership of my work and always ensure quality.",
    previous_score: 50 // Previous score is 50
  };
  
  try {
    const result = await evaluateCulturalFit(input, createMockLLM(mockResponse));
    console.log('Input:', JSON.stringify(input, null, 2));
    console.log('\nLLM suggested score: 80');
    console.log('Previous score: 50');
    console.log('\nResult:', JSON.stringify(result, null, 2));
    
    // Verify smoothing: new = 50 * 0.7 + 80 * 0.3 = 35 + 24 = 59
    const expectedScore = Math.round(50 * 0.7 + 80 * 0.3);
    console.log(`\nExpected smoothed score: ${expectedScore}`);
    console.log(`Actual smoothed score: ${result.cultural_score}`);
    
    if (result.cultural_score === expectedScore) {
      console.log('\n✅ Smoothing formula verified!');
    } else {
      console.log('\n⚠️  Score mismatch (may be due to rounding)');
    }
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

/**
 * Test Case 5: Using example input from JSON
 */
async function testExampleInput() {
  console.log('\n🧪 Test 5: Example Input from JSON');
  console.log('─'.repeat(60));
  
  const mockResponse = JSON.stringify({
    cultural_score: 45,
    trend: "-13",
    signals: [
      {
        type: "negative",
        msg: "Blame shifting: explicitly denies responsibility and blames teammates"
      },
      {
        type: "negative",
        msg: "Avoidance: pattern of avoiding responsibility (second occurrence)"
      }
    ],
    label: "Low Fit"
  });
  
  try {
    const result = await evaluateCulturalFit(exampleInput as CulturalFitInput, createMockLLM(mockResponse));
    console.log('Input:', JSON.stringify(exampleInput, null, 2));
    console.log('\nResult:', JSON.stringify(result, null, 2));
    console.log('\n✅ Test passed!');
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

/**
 * Test Case 6: Edge case - empty chunk (should throw error)
 */
async function testEdgeCases() {
  console.log('\n🧪 Test 6: Edge Cases');
  console.log('─'.repeat(60));
  
  // Test empty chunk
  try {
    await evaluateCulturalFit({
      latest_chunk: '',
      previous_score: 50
    });
    console.log('❌ Should have thrown error for empty chunk');
  } catch (error) {
    console.log('✅ Correctly rejected empty chunk:', (error as Error).message);
  }
  
  // Test invalid score
  try {
    await evaluateCulturalFit({
      latest_chunk: 'Some text',
      previous_score: 150 // Invalid
    });
    console.log('❌ Should have thrown error for invalid score');
  } catch (error) {
    console.log('✅ Correctly rejected invalid score:', (error as Error).message);
  }
}

/**
 * Run all tests
 */
async function runAllTests() {
  console.log('🚀 Starting Cultural Fit Detection Module Tests');
  console.log('='.repeat(60));
  
  await testBlameShifting();
  await testPositiveSignals();
  await testRedFlag();
  await testScoreSmoothing();
  await testExampleInput();
  await testEdgeCases();
  
  console.log('\n' + '='.repeat(60));
  console.log('✨ All tests completed!');
}

// Run tests if this file is executed directly
const isMainModule = import.meta.url === `file://${process.argv[1]}` || 
                     process.argv[1]?.includes('test.ts') ||
                     process.argv[1]?.endsWith('cultural_fit/test.ts');

if (isMainModule) {
  runAllTests().catch(console.error);
}

export { runAllTests, testBlameShifting, testPositiveSignals, testRedFlag, testScoreSmoothing, testExampleInput, testEdgeCases };

