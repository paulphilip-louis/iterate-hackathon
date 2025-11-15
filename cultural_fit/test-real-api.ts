/**
 * Test file for Cultural Fit Detection module with REAL Groq API
 * 
 * This file tests the module with actual API calls to Groq's llama-4-maverick model.
 * Make sure you have GROQ_API_KEY set in your .env file.
 * 
 * Run with: npx tsx cultural_fit/test-real-api.ts
 */

import { evaluateCulturalFit } from './culturalFitEvaluator';
import { CulturalFitInput } from './types';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load .env file from cultural_fit directory or project root
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: join(__dirname, '.env') }); // Try cultural_fit/.env first
config({ path: join(__dirname, '..', '.env') }); // Fallback to project root/.env

/**
 * Test with real API call
 */
async function testRealAPI() {
  console.log('🚀 Testing Cultural Fit Detection with REAL Groq API');
  console.log('='.repeat(60));
  
  // Check if API key is set
  if (!process.env.GROQ_API_KEY) {
    console.error('❌ ERROR: GROQ_API_KEY not found in environment variables');
    console.error('   Please create a .env file with: GROQ_API_KEY=your_key_here');
    process.exit(1);
  }
  
  console.log('✅ GROQ_API_KEY found');
  console.log(`📦 Model: meta-llama/llama-4-maverick-17b-128e-instruct`);
  console.log('');
  
  // Test Case 1: Negative signal (blame shifting)
  console.log('🧪 Test 1: Blame Shifting (Negative Signal)');
  console.log('─'.repeat(60));
  
  const input1: CulturalFitInput = {
    latest_chunk: "I think mistakes happen but it was not my fault. My teammates didn't help me.",
    history_summary: "Candidate previously showed good communication but avoided responsibility twice.",
    previous_score: 58
  };
  
  try {
    console.log('Input:', JSON.stringify(input1, null, 2));
    console.log('\n⏳ Calling Groq API...');
    const startTime = Date.now();
    
    const result1 = await evaluateCulturalFit(input1);
    
    const duration = Date.now() - startTime;
    console.log(`\n⏱️  API call took ${duration}ms`);
    console.log('\nResult:', JSON.stringify(result1, null, 2));
    console.log('\n✅ Test 1 passed!');
    console.log(`   Score: ${input1.previous_score} → ${result1.cultural_score} (${result1.trend})`);
    console.log(`   Label: ${result1.label}`);
    console.log(`   Signals: ${result1.signals.length}`);
  } catch (error) {
    console.error('❌ Test 1 failed:', error);
    if (error instanceof Error) {
      console.error('   Error message:', error.message);
    }
  }
  
  // Test Case 2: Positive signal
  console.log('\n\n🧪 Test 2: Positive Signals (Ownership & Accountability)');
  console.log('─'.repeat(60));
  
  const input2: CulturalFitInput = {
    latest_chunk: "I made a mistake in the initial design, but I learned from it and fixed it. I take full responsibility for the delay.",
    history_summary: "Candidate has shown consistent ownership throughout the interview.",
    previous_score: 70
  };
  
  try {
    console.log('Input:', JSON.stringify(input2, null, 2));
    console.log('\n⏳ Calling Groq API...');
    const startTime = Date.now();
    
    const result2 = await evaluateCulturalFit(input2);
    
    const duration = Date.now() - startTime;
    console.log(`\n⏱️  API call took ${duration}ms`);
    console.log('\nResult:', JSON.stringify(result2, null, 2));
    console.log('\n✅ Test 2 passed!');
    console.log(`   Score: ${input2.previous_score} → ${result2.cultural_score} (${result2.trend})`);
    console.log(`   Label: ${result2.label}`);
    console.log(`   Positive signals: ${result2.signals.filter(s => s.type === 'positive').length}`);
  } catch (error) {
    console.error('❌ Test 2 failed:', error);
    if (error instanceof Error) {
      console.error('   Error message:', error.message);
    }
  }
  
  // Test Case 3: Using example input
  console.log('\n\n🧪 Test 3: Example Input from JSON');
  console.log('─'.repeat(60));
  
  const exampleInput: CulturalFitInput = {
    latest_chunk: "I think mistakes happen but it was not my fault. My teammates didn't help me.",
    history_summary: "Candidate previously showed good communication but avoided responsibility twice.",
    previous_score: 58
  };
  
  try {
    console.log('Input:', JSON.stringify(exampleInput, null, 2));
    console.log('\n⏳ Calling Groq API...');
    const startTime = Date.now();
    
    const result3 = await evaluateCulturalFit(exampleInput);
    
    const duration = Date.now() - startTime;
    console.log(`\n⏱️  API call took ${duration}ms`);
    console.log('\nResult:', JSON.stringify(result3, null, 2));
    console.log('\n✅ Test 3 passed!');
  } catch (error) {
    console.error('❌ Test 3 failed:', error);
    if (error instanceof Error) {
      console.error('   Error message:', error.message);
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('✨ All real API tests completed!');
}

// Run tests
testRealAPI().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

