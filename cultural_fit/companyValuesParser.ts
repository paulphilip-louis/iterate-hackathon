/**
 * Company Values Parser
 * 
 * Parses company culture values from a text file.
 * Supports flexible text formats and extracts:
 * - Company name
 * - Core values
 * - Positive behaviors
 * - Negative behaviors
 */

import { readFileSync } from 'fs';
import { CompanyCultureValues } from './types';

/**
 * Parse company values from text content
 * 
 * Supports various formats:
 * - Numbered lists (1. Value, 2. Value)
 * - Bullet points (- Value, * Value)
 * - Section headers (CORE VALUES:, WHAT WE VALUE:, etc.)
 * 
 * @param textContent - Raw text content from the file
 * @returns Parsed company culture values
 */
export function parseCompanyValues(textContent: string): CompanyCultureValues {
  const lines = textContent.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  
  const result: CompanyCultureValues = {
    core_values: [],
    positive_values: [],
    negative_values: []
  };
  
  let currentSection: 'core' | 'positive' | 'negative' | null = null;
  let companyName: string | undefined;
  
  for (const line of lines) {
    // Extract company name (usually at the top)
    if (!companyName && (line.includes('Company') || line.includes('Values'))) {
      const nameMatch = line.match(/^([^-\n]+?)\s*(?:-|Company|Values)/i);
      if (nameMatch) {
        companyName = nameMatch[1].trim();
      }
    }
    
    // Detect section headers
    const upperLine = line.toUpperCase();
    if (upperLine.includes('CORE VALUES') || upperLine.includes('VALUES:')) {
      currentSection = 'core';
      continue;
    } else if (upperLine.includes('WHAT WE VALUE') || upperLine.includes('POSITIVE')) {
      currentSection = 'positive';
      continue;
    } else if (upperLine.includes('WHAT WE AVOID') || upperLine.includes('NEGATIVE')) {
      currentSection = 'negative';
      continue;
    }
    
    // Extract values from various formats
    let value: string | null = null;
    
    // Numbered list: "1. Value" or "1) Value"
    const numberedMatch = line.match(/^\d+[.)]\s*(.+)$/);
    if (numberedMatch) {
      value = numberedMatch[1].trim();
    }
    // Bullet point: "- Value" or "* Value"
    else if (line.match(/^[-*•]\s+(.+)$/)) {
      value = line.replace(/^[-*•]\s+/, '').trim();
    }
    // Dash format: "Value - Description"
    else if (line.includes(' - ')) {
      value = line.split(' - ')[0].trim();
    }
    // Simple line (if it looks like a value)
    else if (line.length > 3 && line.length < 100 && !line.includes(':')) {
      value = line;
    }
    
    if (value) {
      // Clean up the value
      value = value.replace(/^[-*•\d.)\s]+/, '').trim();
      
      if (value.length > 0) {
        if (currentSection === 'core' || (!currentSection && result.core_values.length < 10)) {
          result.core_values.push(value);
        } else if (currentSection === 'positive') {
          result.positive_values!.push(value);
        } else if (currentSection === 'negative') {
          result.negative_values!.push(value);
        }
      }
    }
  }
  
  // If no core values found, try to extract from any lines
  if (result.core_values.length === 0) {
    for (const line of lines) {
      if (line.length > 10 && line.length < 150 && !line.includes(':')) {
        const cleanLine = line.replace(/^[-*•\d.)\s]+/, '').trim();
        if (cleanLine.length > 0) {
          result.core_values.push(cleanLine);
        }
        if (result.core_values.length >= 8) break;
      }
    }
  }
  
  result.company_name = companyName;
  result.raw_text = textContent;
  
  return result;
}

/**
 * Load and parse company values from a file
 * 
 * @param filePath - Path to the company values text file
 * @returns Parsed company culture values
 */
export function loadCompanyValuesFromFile(filePath: string): CompanyCultureValues {
  try {
    const fileContent = readFileSync(filePath, 'utf-8');
    return parseCompanyValues(fileContent);
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to load company values from ${filePath}: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Get company values from input (file path or direct object)
 * 
 * @param input - Cultural fit input with optional company values
 * @returns Company culture values or null if not provided
 */
export function getCompanyValues(input: { company_values_file_path?: string; company_values?: CompanyCultureValues }): CompanyCultureValues | null {
  if (input.company_values) {
    return input.company_values;
  }
  
  if (input.company_values_file_path) {
    return loadCompanyValuesFromFile(input.company_values_file_path);
  }
  
  return null;
}

