/**
 * LLM Classifier
 * 
 * Classifies transcript chunks into script sections and subsections using LLM.
 * Uses Anthropic Claude API by default.
 */

import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { ClassificationResult, LLMClassificationResponse } from './types';
import { INTERVIEW_SCRIPT } from './interviewScript';

// Load .env file from multiple possible locations
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..', '..');

// Try multiple .env locations
config({ path: join(projectRoot, '.env') });
config({ path: join(projectRoot, 'Modules', '.env') });
config({ path: join(projectRoot, 'modules', '.env') });
config({ path: join(projectRoot, 'script_tracking', '.env') });
config({ path: join(__dirname, '.env') });

/**
 * Build the system prompt for classification
 */
function buildClassificationPrompt(): string {
  const scriptDescription = INTERVIEW_SCRIPT.map(section => {
    const subsections = section.subsections
      .map(sub => `    ${sub.id} - ${sub.label}`)
      .join('\n');
    
    // Add keywords/examples for each section
    const keywords = getSectionKeywords(section.id);
    const keywordsStr = keywords.length > 0 ? `\n    Keywords: ${keywords.join(', ')}` : '';
    
    return `SECTION ${section.id} — ${section.name}${keywordsStr}\n${subsections}`;
  }).join('\n\n');

  return `You are an expert in job interview analysis. Your task is to classify each transcript chunk into the correct section and subsection of the interview script.

REFERENCE INTERVIEW SCRIPT:

${scriptDescription}

CLASSIFICATION GUIDELINES:
- SECTION 1 (Personal Background):
  * 1.1 Personal introduction: Greetings, name, basic introduction ("Hi, I'm...", "Nice to meet you")
  * 1.2 Professional background summary: Work history, previous roles, experience ("I worked at...", "My background is...", "I have X years of experience")
  * 1.3 Motivations & ambitions: Career goals, what drives them, aspirations ("I'm motivated by...", "My goal is...", "I want to...")
  * 1.4 What they're looking for in a work environment: Work style preferences, team culture, environment ("I'm looking for...", "I prefer...", "I need...")
  
- SECTION 2 (Company & Role Fit):
  * 2.1 Why our company?: Specific reasons to join THIS company ("Why this company?", "I chose you because...")
  * 2.2 Motivation for the role: Why THIS specific role interests them ("I'm interested in this role because...")
  * 2.3 What they already know about the team / product: Knowledge about company/team ("I know that...", "I've heard...", "I researched...")
  * 2.4 Culture / management expectations: Expectations about culture, management style ("I expect...", "I value...")
  
- SECTION 3 (Technical Evaluation):
  * 3.1 Technical project experience: Past projects, technical work ("I worked on...", "I built...", "My project...")
  * 3.2 Architecture & design: System design, architecture discussions ("The architecture was...", "I designed...")
  * 3.3 Specific skills: Technical skills, technologies ("I used...", "I know...", "I'm skilled in...")
  * 3.4 Problem solving: How they solve problems, approach ("To solve this...", "I would...", "My approach...")
  
- SECTION 4 (Candidate Questions):
  * 4.1 Questions about the team: Questions about team structure, dynamics ("What about the team?", "How is the team?")
  * 4.2 Questions about the roadmap: Questions about product roadmap, future plans ("What's the roadmap?", "What are the plans?")
  * 4.3 Questions about compensation / process: Questions about salary, benefits, hiring process ("What about compensation?", "What's the process?")
  
- SECTION 5 (Closing):
  * 5.1 Summary: Summarizing the interview ("To summarize...", "So to recap...")
  * 5.2 Next steps: Discussing what happens next ("Next steps are...", "What's next?")
  * 5.3 Thank you / closing remarks: Thanking, closing ("Thank you", "Looking forward...", "It was great...")

INSTRUCTIONS:
1. Analyze the provided transcript chunk carefully
2. Identify the section (1-5) and subsection (format "X.Y") that BEST matches the content
3. Be SPECIFIC: Distinguish between subsections (e.g., 1.1 vs 1.2 vs 1.3) based on the exact topic discussed
4. A subsection is "completed" when the topic has been substantially discussed (not just mentioned)
5. If the topic is completely off-script (small talk, technical issues, etc.), mark isOffScript: true
6. Provide a confidence score: 0.9+ for very clear matches, 0.7-0.8 for good matches, 0.5-0.6 for uncertain
7. Mark deviation: true if jumping ahead, going backward, or mixing topics
8. Give a clear, concise reason for your classification

EXPECTED RESPONSE (strict JSON):
{
  "section": 1-5 or null,
  "subsection": "X.Y" or null,
  "confidence": 0.0-1.0,
  "deviation": true/false,
  "isOffScript": true/false,
  "reason": "clear explanation in English"
}`;
}

/**
 * Get keywords/examples for each section to help classification
 * Returns keywords for both English and French
 */
function getSectionKeywords(sectionId: number): string[] {
  const keywords: Record<number, string[]> = {
    1: ['introduction', 'background', 'experience', 'career', 'motivation', 'ambition', 'looking for', 'work environment', 'hi', 'hello', 'name', 'worked at', 'introduction', 'background', 'expérience', 'carrière', 'motivation', 'ambition', 'cherche', 'environnement de travail', 'salut', 'bonjour', 'nom', 'travaillé'],
    2: ['why company', 'why this role', 'interested in', 'know about', 'team', 'product', 'culture', 'management', 'expectations', 'fit', 'pourquoi', 'intéressé', 'sait', 'équipe', 'produit', 'culture', 'management', 'attentes'],
    3: ['technical', 'project', 'architecture', 'design', 'skills', 'problem solving', 'code', 'system', 'implementation', 'technology', 'technique', 'projet', 'architecture', 'conception', 'compétences', 'résolution de problème', 'code', 'système', 'implémentation', 'technologie'],
    4: ['question', 'ask', 'wonder', 'curious', 'tell me', 'how', 'what', 'compensation', 'salary', 'process', 'roadmap', 'question', 'demander', 'curieux', 'dis-moi', 'comment', 'quoi', 'compensation', 'salaire', 'processus', 'feuille de route'],
    5: ['summary', 'summarize', 'next steps', 'thank you', 'thanks', 'closing', 'looking forward', 'follow up', 'wrap up', 'résumé', 'résumer', 'prochaines étapes', 'merci', 'fermeture', 'hâte', 'suivi']
  };
  return keywords[sectionId] || [];
}

/**
 * Get keywords for specific subsections to help classification
 * Returns keywords for both English and French
 */
function getSubsectionKeywords(sectionId: number, subsectionId: string): string[] {
  const keywords: Record<string, string[]> = {
    // Section 1
    '1.1': ['hi', 'hello', 'salut', 'bonjour', 'introduction', 'name', 'nom', 'meet', 'rencontrer', 'greeting', 'salutation'],
    '1.2': ['background', 'background professionnel', 'experience', 'expérience', 'worked at', 'travaillé', 'career', 'carrière', 'history', 'historique', 'previous', 'précédent', 'roles', 'rôles'],
    '1.3': ['motivation', 'ambition', 'goal', 'objectif', 'driven', 'motivé', 'aspiration', 'want', 'veux', 'aim', 'but'],
    '1.4': ['looking for', 'cherche', 'prefer', 'préfère', 'need', 'besoin', 'work environment', 'environnement de travail', 'team culture', 'culture d\'équipe', 'style', 'environment', 'environnement'],
    // Section 2
    '2.1': ['why company', 'pourquoi cette entreprise', 'why you', 'pourquoi vous', 'chose', 'choisi', 'chosen'],
    '2.2': ['why this role', 'pourquoi ce rôle', 'interested in role', 'intéressé par le rôle', 'motivation for role', 'motivation pour le rôle'],
    '2.3': ['know about', 'sait', 'heard', 'entendu', 'researched', 'recherché', 'team', 'équipe', 'product', 'produit'],
    '2.4': ['culture', 'management', 'expectations', 'attentes', 'expect', 'attendre', 'value', 'valoriser'],
    // Section 3
    '3.1': ['project', 'projet', 'worked on', 'travaillé sur', 'built', 'construit', 'developed', 'développé'],
    '3.2': ['architecture', 'design', 'conception', 'designed', 'conçu', 'system design', 'conception de système'],
    '3.3': ['skills', 'compétences', 'used', 'utilisé', 'know', 'sais', 'skilled in', 'compétent en', 'technologies', 'tech'],
    '3.4': ['problem solving', 'résolution de problème', 'solve', 'résoudre', 'approach', 'approche', 'would', 'ferais'],
    // Section 4
    '4.1': ['question about team', 'question sur l\'équipe', 'team', 'équipe', 'how is team', 'comment est l\'équipe'],
    '4.2': ['roadmap', 'feuille de route', 'plans', 'plans', 'future', 'futur', 'what\'s next', 'qu\'est-ce qui suit'],
    '4.3': ['compensation', 'salaire', 'salary', 'benefits', 'avantages', 'process', 'processus', 'hiring', 'recrutement'],
    // Section 5
    '5.1': ['summary', 'résumé', 'summarize', 'résumer', 'recap', 'récapituler', 'to summarize', 'pour résumer'],
    '5.2': ['next steps', 'prochaines étapes', 'what\'s next', 'qu\'est-ce qui suit', 'follow up', 'suivi'],
    '5.3': ['thank you', 'merci', 'thanks', 'closing', 'fermeture', 'looking forward', 'hâte', 'great', 'génial']
  };
  return keywords[subsectionId] || [];
}

/**
 * Call LLM for classification
 * Supports Anthropic, Groq, and OpenRouter
 */
async function callLLMForClassification(chunk: string): Promise<string> {
  // Use Groq with llama-3.1-70b-versatile (like cultural fit module)
  const groqKey = process.env.GROQ_API_KEY;

  if (!groqKey) {
    throw new Error('GROQ_API_KEY not found in environment variables. Please set it in your .env file.');
  }

  // Force Groq provider and model
  const provider = 'groq';
  const model = 'meta-llama/llama-4-maverick-17b-128e-instruct'; // Use llama-4-maverick like cultural fit
  const apiKey = groqKey; // Use groqKey as apiKey

  console.log(`🔑 Using LLM provider: ${provider}, model: ${model}`);
  console.log(`   GROQ_API_KEY exists: ${!!groqKey}`);
  console.log(`   API key length: ${groqKey ? groqKey.length : 0}`);
  console.log(`   LLM_MODEL env var: ${process.env.LLM_MODEL || 'not set'}`);

  const systemPrompt = buildClassificationPrompt();
  const userMessage = `Analyze this transcript chunk and classify it into the interview script:\n\n"${chunk}"`;

  try {
    let apiUrl: string;
    let headers: Record<string, string>;
    let body: Record<string, any>;

    // Use Groq API
    apiUrl = 'https://api.groq.com/openai/v1/chat/completions';
    headers = {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    };
    body = {
      model: model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage }
      ],
      temperature: 0.1,
      max_tokens: 300,
      response_format: { type: 'json_object' }
    };

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ ${provider.toUpperCase()} API error response:`, errorText);
      throw new Error(`${provider.toUpperCase()} API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    
    // Handle Groq response format (OpenAI-compatible)
    const choice = data.choices?.[0];
    if (!choice?.message?.content) {
      throw new Error(`${provider} API returned empty content`);
    }
    return choice.message.content.trim();
  } catch (error) {
    if (error instanceof Error) {
      // Make sure error message doesn't mention OpenAI if we're using Anthropic
      const errorMsg = error.message.includes('openai') && provider === 'anthropic'
        ? error.message.replace(/openai/gi, 'anthropic')
        : error.message;
      throw new Error(`${provider.toUpperCase()} API error: ${errorMsg}`);
    }
    throw error;
  }
}

/**
 * Parse LLM response for classification
 */
function parseLLMResponse(response: string): LLMClassificationResponse {
  let cleaned = response.trim();

  // Remove markdown code blocks if present
  if (cleaned.includes('```json')) {
    const jsonBlock = cleaned.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonBlock && jsonBlock[1]) {
      cleaned = jsonBlock[1].trim();
    }
  } else if (cleaned.includes('```')) {
    const codeBlock = cleaned.match(/```\s*([\s\S]*?)\s*```/);
    if (codeBlock && codeBlock[1]) {
      cleaned = codeBlock[1].trim();
    }
  }

  // Try to extract JSON from response
  // Look for the last JSON object in the response (for thinking models)
  const lastBrace = cleaned.lastIndexOf('}');
  if (lastBrace > 0) {
    let braceCount = 1;
    let startIdx = lastBrace - 1;
    while (startIdx >= 0 && braceCount > 0) {
      if (cleaned[startIdx] === '}') braceCount++;
      if (cleaned[startIdx] === '{') braceCount--;
      if (braceCount === 0) break;
      startIdx--;
    }
    if (startIdx >= 0 && braceCount === 0) {
      const jsonCandidate = cleaned.substring(startIdx, lastBrace + 1);
      try {
        const parsed = JSON.parse(jsonCandidate);
        if (parsed.section !== undefined || parsed.isOffScript !== undefined) {
          return parsed as LLMClassificationResponse;
        }
      } catch (e) {
        // Continue to try other methods
      }
    }
  }

  // Try direct JSON parse
  try {
    return JSON.parse(cleaned) as LLMClassificationResponse;
  } catch (error) {
    // Try to extract JSON object containing classification fields
    const sectionPattern = /"section"\s*:/;
    const sectionIndex = cleaned.lastIndexOf('"section"');
    
    if (sectionIndex >= 0) {
      let jsonStart = cleaned.lastIndexOf('{', sectionIndex);
      if (jsonStart < 0) {
        jsonStart = cleaned.substring(0, sectionIndex).lastIndexOf('{');
      }
      
      if (jsonStart >= 0) {
        let braceCount = 1;
        let jsonEnd = jsonStart + 1;
        while (jsonEnd < cleaned.length && braceCount > 0) {
          if (cleaned[jsonEnd] === '{') braceCount++;
          if (cleaned[jsonEnd] === '}') braceCount--;
          if (braceCount === 0) break;
          jsonEnd++;
        }
        
        if (braceCount === 0) {
          const jsonCandidate = cleaned.substring(jsonStart, jsonEnd + 1);
          try {
            const parsed = JSON.parse(jsonCandidate);
            if (parsed.section !== undefined || parsed.isOffScript !== undefined) {
              return parsed as LLMClassificationResponse;
            }
          } catch (e) {
            // Continue
          }
        }
      }
    }

    // Last resort: try simple JSON pattern
    const jsonPattern = /\{[\s\S]*?"section"[\s\S]*?\}/;
    const matches = cleaned.match(jsonPattern);
    if (matches && matches[0]) {
      try {
        return JSON.parse(matches[0]) as LLMClassificationResponse;
      } catch (e) {
        // Fall through to error
      }
    }

    throw new Error(`No valid JSON found in LLM response. First 200 chars: ${cleaned.substring(0, 200)}`);
  }
}

/**
 * Validate and normalize classification result
 */
function validateClassificationResult(result: LLMClassificationResponse): ClassificationResult {
  // Validate section
  let section: number | null = result.section ?? null;
  if (section !== null) {
    if (typeof section !== 'number' || section < 1 || section > 5) {
      section = null;
    }
  }

  // Validate subsection
  let subsection: string | null = result.subsection ?? null;
  if (subsection !== null) {
    if (typeof subsection !== 'string') {
      subsection = null;
    } else {
      // Validate format (e.g., "1.1", "2.3")
      const subsectionPattern = /^\d+\.\d+$/;
      if (!subsectionPattern.test(subsection)) {
        subsection = null;
      } else {
        // Validate that subsection belongs to the section
        const [sectionNum] = subsection.split('.').map(Number);
        if (section !== null && sectionNum !== section) {
          // Mismatch: use section to infer subsection or null
          subsection = null;
        }
      }
    }
  }

  // Validate confidence
  let confidence = result.confidence ?? 0.5;
  if (typeof confidence !== 'number' || confidence < 0 || confidence > 1) {
    confidence = 0.5;
  }

  // Validate boolean fields
  const deviation = result.deviation ?? false;
  const isOffScript = result.isOffScript ?? false;

  // Validate reason
  const reason = result.reason ?? 'Classification completed';

  return {
    section,
    subsection,
    confidence,
    deviation: Boolean(deviation),
    isOffScript: Boolean(isOffScript),
    reason: String(reason)
  };
}

/**
 * Classify using keyword matching as fallback
 * 
 * @param chunk - Transcript chunk to classify
 * @returns Classification result
 */
function classifyByKeywords(chunk: string): ClassificationResult {
  const lowerChunk = chunk.toLowerCase();
  
  // Score each subsection based on keyword matches
  const subsectionScores: Record<string, number> = {};
  
  // Initialize scores for all subsections
  for (const section of INTERVIEW_SCRIPT) {
    for (const subsection of section.subsections) {
      subsectionScores[subsection.id] = 0;
    }
  }
  
  // Check keywords for each subsection
  for (const section of INTERVIEW_SCRIPT) {
    for (const subsection of section.subsections) {
      const keywords = getSubsectionKeywords(section.id, subsection.id);
      for (const keyword of keywords) {
        if (lowerChunk.includes(keyword.toLowerCase())) {
          subsectionScores[subsection.id] += 1;
        }
      }
    }
  }
  
  // Find subsection with highest score
  let maxScore = 0;
  let bestSubsection: string | null = null;
  for (const [subsectionId, score] of Object.entries(subsectionScores)) {
    if (score > maxScore) {
      maxScore = score;
      bestSubsection = subsectionId;
    }
  }
  
  // If no clear match, try section-level keywords as fallback
  if (maxScore === 0 || bestSubsection === null) {
    const sectionScores: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    
    for (let sectionId = 1; sectionId <= 5; sectionId++) {
      const keywords = getSectionKeywords(sectionId);
      for (const keyword of keywords) {
        if (lowerChunk.includes(keyword.toLowerCase())) {
          sectionScores[sectionId] += 1;
        }
      }
    }
    
    let maxSectionScore = 0;
    let bestSection: number | null = null;
    for (const [sectionId, score] of Object.entries(sectionScores)) {
      if (score > maxSectionScore) {
        maxSectionScore = score;
        bestSection = parseInt(sectionId);
      }
    }
    
    if (maxSectionScore === 0 || bestSection === null) {
      return {
        section: null,
        subsection: null,
        confidence: 0,
        deviation: false,
        isOffScript: false,
        reason: 'No keyword matches found'
      };
    }
    
    // Use first subsection of the section as fallback
    const section = INTERVIEW_SCRIPT.find(s => s.id === bestSection);
    const subsection = section && section.subsections.length > 0 
      ? section.subsections[0].id 
      : null;
    
    const confidence = Math.min(0.6, 0.4 + (maxSectionScore / 10));
    
    return {
      section: bestSection,
      subsection,
      confidence,
      deviation: false,
      isOffScript: false,
      reason: `Keyword-based classification (section-level, ${maxSectionScore} matches)`
    };
  }
  
  // Extract section from subsection ID (e.g., "1.2" -> 1)
  const sectionNum = parseInt(bestSubsection.split('.')[0]);
  
  // Calculate confidence based on score (normalized to 0.4-0.6 range for fallback)
  const confidence = Math.min(0.6, 0.4 + (maxScore / 10));
  
  return {
    section: sectionNum,
    subsection: bestSubsection,
    confidence,
    deviation: false,
    isOffScript: false,
    reason: `Keyword-based classification (subsection ${bestSubsection}, ${maxScore} matches)`
  };
}

/**
 * Classify a transcript chunk into script section/subsection
 * Uses LLM first, falls back to keyword matching if LLM fails or confidence is too low
 * 
 * @param chunk - Transcript chunk to classify
 * @returns Classification result
 */
export async function classifyChunk(chunk: string): Promise<ClassificationResult> {
  if (!chunk || chunk.trim().length === 0) {
    return {
      section: null,
      subsection: null,
      confidence: 0,
      deviation: false,
      isOffScript: false,
      reason: 'Empty or invalid chunk'
    };
  }

  try {
    // Limit chunk size to avoid token limits
    const limitedChunk = chunk.substring(0, 500);
    
    const rawResponse = await callLLMForClassification(limitedChunk);
    const parsed = parseLLMResponse(rawResponse);
    const validated = validateClassificationResult(parsed);
    
    // If LLM confidence is too low (< 0.4), try keyword fallback
    if (validated.confidence < 0.4 && validated.section === null) {
      console.log('⚠️ LLM confidence too low, trying keyword fallback...');
      const keywordResult = classifyByKeywords(chunk);
      
      // Use keyword result if it has a section, otherwise use LLM result
      if (keywordResult.section !== null) {
        console.log(`✅ Keyword fallback found section ${keywordResult.section} with confidence ${keywordResult.confidence.toFixed(2)}`);
        return keywordResult;
      }
    }
    
    return validated;
  } catch (error) {
    console.error('❌ Error in LLM classification, trying keyword fallback:', error);
    
    // Try keyword fallback on error
    const keywordResult = classifyByKeywords(chunk);
    if (keywordResult.section !== null) {
      console.log(`✅ Keyword fallback found section ${keywordResult.section} after LLM error`);
      return keywordResult;
    }
    
    // Return safe fallback
    return {
      section: null,
      subsection: null,
      confidence: 0,
      deviation: false,
      isOffScript: false,
      reason: `Classification error: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

