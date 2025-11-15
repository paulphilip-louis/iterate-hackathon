/**
 * In-memory fact store for candidate profile facts
 * 
 * This is a simple in-memory store. In production, this could be
 * replaced with a database or persistent storage.
 */

import { ProfileFacts } from '../contradiction_detection/types';
import { FactStore } from './types';

// Global in-memory store
let factStore: FactStore = {
  facts: null,
  last_updated: undefined
};

/**
 * Get current stored facts
 * @returns Current profile facts or null if none stored
 */
export function getFacts(): ProfileFacts | null {
  return factStore.facts;
}

/**
 * Update stored facts
 * @param newFacts - New profile facts to store
 */
export function updateFacts(newFacts: ProfileFacts): void {
  factStore.facts = {
    ...newFacts,
    extracted_at: Date.now()
  };
  factStore.last_updated = Date.now();
}

/**
 * Reset the fact store (clear all facts)
 */
export function resetFacts(): void {
  factStore = {
    facts: null,
    last_updated: undefined
  };
}

/**
 * Get the entire store state (for debugging)
 * @returns Current store state
 */
export function getStoreState(): FactStore {
  return { ...factStore };
}

