/**
 * Summarizer for fact store
 * 
 * Produces compressed summaries of stored facts for LLM context
 */

import { ProfileFacts } from '../contradiction_detection/types';

/**
 * Generate a compressed text summary of profile facts for LLM context
 * 
 * @param facts - Profile facts to summarize
 * @returns Compressed text summary
 */
export function summarizeFacts(facts: ProfileFacts | null): string {
  if (!facts) {
    return 'No profile facts stored yet.';
  }
  
  const parts: string[] = [];
  
  if (facts.years_experience !== undefined) {
    parts.push(`Experience: ${facts.years_experience} years`);
  }
  
  if (facts.job_titles && facts.job_titles.length > 0) {
    parts.push(`Job titles: ${facts.job_titles.join(', ')}`);
  }
  
  if (facts.companies && facts.companies.length > 0) {
    parts.push(`Companies: ${facts.companies.join(', ')}`);
  }
  
  if (facts.degrees && facts.degrees.length > 0) {
    parts.push(`Education: ${facts.degrees.join(', ')}`);
  }
  
  if (facts.leadership_experience && facts.leadership_experience.length > 0) {
    parts.push(`Leadership: ${facts.leadership_experience.join(', ')}`);
  }
  
  if (facts.languages && facts.languages.length > 0) {
    parts.push(`Languages: ${facts.languages.join(', ')}`);
  }
  
  if (facts.tech_stack && facts.tech_stack.length > 0) {
    parts.push(`Tech stack: ${facts.tech_stack.join(', ')}`);
  }
  
  if (facts.salary_expectations !== undefined) {
    parts.push(`Salary: ${facts.salary_expectations}`);
  }
  
  if (parts.length === 0) {
    return 'No significant facts extracted yet.';
  }
  
  return parts.join('. ') + '.';
}

/**
 * Generate a JSON summary of facts (for structured comparison)
 * 
 * @param facts - Profile facts to summarize
 * @returns JSON string summary
 */
export function summarizeFactsJSON(facts: ProfileFacts | null): string {
  if (!facts) {
    return JSON.stringify({});
  }
  
  const summary: any = {};
  
  if (facts.years_experience !== undefined) summary.years_experience = facts.years_experience;
  if (facts.job_titles) summary.job_titles = facts.job_titles;
  if (facts.companies) summary.companies = facts.companies;
  if (facts.degrees) summary.degrees = facts.degrees;
  if (facts.leadership_experience) summary.leadership_experience = facts.leadership_experience;
  if (facts.languages) summary.languages = facts.languages;
  if (facts.tech_stack) summary.tech_stack = facts.tech_stack;
  if (facts.salary_expectations !== undefined) summary.salary_expectations = facts.salary_expectations;
  
  return JSON.stringify(summary);
}

