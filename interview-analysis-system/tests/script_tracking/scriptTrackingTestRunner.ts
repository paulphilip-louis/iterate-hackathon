/**
 * Test runner for script tracking module
 * 
 * Tests:
 * - LLM classification of transcript chunks
 * - Deviation detection (jump ahead, going backward, off-script, etc.)
 * - Script state tracking and progress
 */

import { processTranscriptChunk, resetScriptTracker, INTERVIEW_SCRIPT } from '../../modules/script_tracking';
import { ScriptTrackingOutput } from '../../modules/script_tracking/types';

// Helper functions for formatting
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function formatSection(sectionId: number | null): string {
  if (sectionId === null) return '❓ Off-script';
  const section = INTERVIEW_SCRIPT.find(s => s.id === sectionId);
  return section ? `📋 Section ${sectionId}: ${section.name}` : `❓ Section ${sectionId}`;
}

function formatSubsection(subsectionId: string | null): string {
  if (subsectionId === null) return 'N/A';
  return `  └─ ${subsectionId}`;
}

function formatDeviation(hasDeviation: boolean, type: string | null, message: string | null): string {
  if (!hasDeviation) return '✅ No deviation';
  const emoji: Record<string, string> = {
    'jump_ahead': '⏩',
    'going_backward': '⏪',
    'off_script': '🚫',
    'mixed_topics': '🔀',
    'out_of_order': '🔄'
  };
  const emojiIcon = emoji[type || ''] || '⚠️';
  return `${emojiIcon} ${type || 'deviation'}: ${message || 'N/A'}`;
}

function formatProgress(progress: number): string {
  const barLength = 20;
  const filled = Math.round((progress / 100) * barLength);
  const empty = barLength - filled;
  const bar = '█'.repeat(filled) + '░'.repeat(empty);
  return `${bar} ${progress.toFixed(1)}%`;
}

/**
 * Test scenarios for script tracking
 */
const TEST_SCENARIOS = [
  {
    name: 'Section 1 - Présentation personnelle',
    chunk: "Bonjour, je m'appelle Jean Dupont. J'ai 32 ans et je suis développeur full-stack depuis 8 ans. J'ai commencé ma carrière dans une startup parisienne où j'ai développé des compétences en React et Node.js.",
    expectedSection: 1,
    expectedSubsection: '1.1'
  },
  {
    name: 'Section 1 - Parcours professionnel',
    chunk: "Mon parcours professionnel a été assez linéaire. J'ai d'abord travaillé 3 ans dans une startup, puis j'ai rejoint une scale-up où j'ai évolué de développeur à lead developer. Actuellement, je cherche à prendre plus de responsabilités.",
    expectedSection: 1,
    expectedSubsection: '1.2'
  },
  {
    name: 'Section 1 - Motivations',
    chunk: "Ce qui me motive vraiment, c'est de travailler sur des projets innovants avec une équipe soudée. J'aimerais contribuer à des produits qui ont un impact réel sur les utilisateurs.",
    expectedSection: 1,
    expectedSubsection: '1.3'
  },
  {
    name: 'Section 2 - Company Fit',
    chunk: "Je connais bien votre entreprise. J'apprécie particulièrement votre approche de l'innovation et votre culture d'entreprise. Je pense que mes valeurs s'alignent bien avec les vôtres.",
    expectedSection: 2,
    expectedSubsection: '2.1'
  },
  {
    name: 'Section 3 - Technical Skills',
    chunk: "Sur le plan technique, je maîtrise React, TypeScript, Node.js, et j'ai de l'expérience avec les architectures microservices. J'ai aussi travaillé avec Docker et Kubernetes.",
    expectedSection: 3,
    expectedSubsection: '3.1'
  },
  {
    name: 'OFF-SCRIPT - Discussion personnelle',
    chunk: "Ah, vous savez, j'adore le football. Je joue tous les weekends avec mes amis. C'est vraiment ma passion en dehors du travail.",
    expectedSection: null,
    expectedSubsection: null,
    isOffScript: true
  },
  {
    name: 'Section 4 - Behavioral Questions',
    chunk: "Pour vous donner un exemple concret, j'ai dû gérer une situation difficile l'année dernière. Un de nos clients était très mécontent d'un bug critique. J'ai pris l'initiative de coordonner l'équipe pour résoudre le problème rapidement.",
    expectedSection: 4,
    expectedSubsection: '4.1'
  },
  {
    name: 'JUMP AHEAD - Section 6 (saut depuis Section 4)',
    chunk: "Pour conclure, j'aimerais vraiment rejoindre votre équipe. Je pense que je peux apporter beaucoup de valeur et je suis très motivé pour ce poste.",
    expectedSection: 6,
    expectedSubsection: '6.1',
    shouldDetectJump: true
  },
  {
    name: 'GOING BACKWARD - Retour Section 2',
    chunk: "Ah, j'ai oublié de mentionner quelque chose sur votre entreprise. Je trouve que votre politique de télétravail est vraiment intéressante.",
    expectedSection: 2,
    expectedSubsection: '2.2',
    shouldDetectBackward: true
  }
];

/**
 * Run a single test scenario
 */
async function runTestScenario(scenario: typeof TEST_SCENARIOS[0], index: number): Promise<void> {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`📝 Test ${index + 1}/${TEST_SCENARIOS.length}: ${scenario.name}`);
  console.log(`${'='.repeat(80)}`);
  console.log(`\n💬 Chunk: "${scenario.chunk.substring(0, 100)}${scenario.chunk.length > 100 ? '...' : ''}"`);
  
  try {
    const startTime = Date.now();
    const result: ScriptTrackingOutput = await processTranscriptChunk(scenario.chunk);
    const elapsed = Date.now() - startTime;
    
    console.log(`\n⏱️  Processing time: ${elapsed}ms`);
    
    // Display LLM classification
    console.log(`\n🤖 LLM Classification:`);
    console.log(`   Section: ${formatSection(result.llm.section)}`);
    console.log(`   Subsection: ${formatSubsection(result.llm.subsection)}`);
    console.log(`   Confidence: ${(result.llm.confidence * 100).toFixed(1)}%`);
    console.log(`   Off-script: ${result.llm.isOffScript ? '🚫 Yes' : '✅ No'}`);
    console.log(`   Reason: ${result.llm.reason}`);
    
    // Display deviation detection
    console.log(`\n⚠️  Deviation Detection:`);
    console.log(`   ${formatDeviation(result.deviation.deviation, result.deviation.type, result.deviation.message)}`);
    
    // Display script state
    console.log(`\n📊 Script State:`);
    console.log(`   Current Section: ${formatSection(result.scriptState.currentSection)}`);
    console.log(`   Current Subsection: ${formatSubsection(result.scriptState.currentSubsection)}`);
    console.log(`   Progress: ${formatProgress(result.scriptState.progress)}`);
    
    // Display completed sections
    const completedSections = Object.entries(result.scriptState.completedSections)
      .filter(([_, completed]) => completed)
      .map(([id, _]) => id);
    if (completedSections.length > 0) {
      console.log(`   Completed Sections: ${completedSections.join(', ')}`);
    }
    
    // Validation
    console.log(`\n✅ Validation:`);
    if (scenario.expectedSection !== undefined) {
      const sectionMatch = result.llm.section === scenario.expectedSection;
      console.log(`   Expected Section ${scenario.expectedSection}: ${sectionMatch ? '✅' : '❌'} (got ${result.llm.section})`);
    }
    
    if (scenario.expectedSubsection !== undefined) {
      const subsectionMatch = result.llm.subsection === scenario.expectedSubsection;
      console.log(`   Expected Subsection ${scenario.expectedSubsection}: ${subsectionMatch ? '✅' : '❌'} (got ${result.llm.subsection})`);
    }
    
    if (scenario.isOffScript) {
      const offScriptMatch = result.llm.isOffScript === true;
      console.log(`   Expected Off-script: ${offScriptMatch ? '✅' : '❌'} (got ${result.llm.isOffScript})`);
    }
    
    if (scenario.shouldDetectJump) {
      const jumpDetected = result.deviation.deviation && result.deviation.type === 'jump_ahead';
      console.log(`   Expected Jump Ahead Detection: ${jumpDetected ? '✅' : '❌'}`);
    }
    
    if (scenario.shouldDetectBackward) {
      const backwardDetected = result.deviation.deviation && result.deviation.type === 'going_backward';
      console.log(`   Expected Going Backward Detection: ${backwardDetected ? '✅' : '❌'}`);
    }
    
  } catch (error) {
    console.error(`\n❌ Error processing chunk:`, error);
    if (error instanceof Error) {
      console.error(`   Message: ${error.message}`);
      console.error(`   Stack: ${error.stack}`);
    }
  }
  
  // Small delay between tests
  await sleep(500);
}

/**
 * Main test runner
 */
async function runTests(): Promise<void> {
  console.log('\n🚀 Starting Script Tracking Tests\n');
  console.log('='.repeat(80));
  console.log('📋 Interview Script Structure:');
  INTERVIEW_SCRIPT.forEach(section => {
    console.log(`\n   Section ${section.id}: ${section.name}`);
    section.subsections.forEach(sub => {
      console.log(`     - ${sub.id}: ${sub.label}`);
    });
  });
  console.log('\n' + '='.repeat(80));
  
  // Reset tracker for fresh start
  resetScriptTracker();
  console.log('\n🔄 Script tracker reset for new interview\n');
  
  // Run all test scenarios
  for (let i = 0; i < TEST_SCENARIOS.length; i++) {
    await runTestScenario(TEST_SCENARIOS[i], i);
  }
  
  console.log(`\n${'='.repeat(80)}`);
  console.log('✅ All tests completed!');
  console.log(`${'='.repeat(80)}\n`);
}

// Run tests if executed directly
const isMainModule = import.meta.url === `file://${process.argv[1]}` || 
                     process.argv[1]?.includes('scriptTrackingTestRunner.ts') ||
                     process.argv[1]?.endsWith('scriptTrackingTestRunner.ts');

if (isMainModule) {
  runTests().catch(error => {
    console.error('❌ Test runner failed:', error);
    process.exit(1);
  });
}

export { runTests, TEST_SCENARIOS };

