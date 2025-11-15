/**
 * Script Tracker
 * 
 * Manages the state of the interview script progression.
 * Tracks which sections and subsections have been covered.
 */

import { INTERVIEW_SCRIPT } from './interviewScript';
import { ClassificationResult, ScriptState } from './types';

export class ScriptTracker {
  /** Current section being discussed (1-6) */
  public currentSection: number = 1;
  
  /** Map of section IDs to completion status */
  public completedSections: Record<number, boolean> = {};
  
  /** Map of subsection IDs to completion status */
  public completedSubsections: Record<string, boolean> = {};
  
  /** Current subsection being discussed */
  public currentSubsection: string | null = null;
  
  /** Timestamp of last update */
  private lastUpdate: number = Date.now();

  constructor() {
    // Initialize all sections as not completed
    INTERVIEW_SCRIPT.forEach(section => {
      this.completedSections[section.id] = false;
      section.subsections.forEach(subsection => {
        this.completedSubsections[subsection.id] = false;
      });
    });
  }

  /**
   * Update script state from LLM classification result
   * 
   * @param result - Classification result from LLM
   */
  updateFromLLM(result: ClassificationResult): void {
    this.lastUpdate = Date.now();

    // If off-script, don't update state
    if (result.isOffScript) {
      return;
    }

    // Update current section if valid
    if (result.section !== null && result.section >= 1 && result.section <= 6) {
      // Only update if confidence is high enough (>= 0.6)
      if (result.confidence >= 0.6) {
        this.currentSection = result.section;
      }
    }

    // Update current subsection if valid
    if (result.subsection !== null) {
      // Validate subsection ID format (e.g., "1.1", "2.3")
      const subsectionPattern = /^\d+\.\d+$/;
      if (subsectionPattern.test(result.subsection)) {
        // Only update if confidence is high enough
        if (result.confidence >= 0.6) {
          this.currentSubsection = result.subsection;
          
          // Mark subsection as completed if confidence is very high
          if (result.confidence >= 0.8) {
            this.completedSubsections[result.subsection] = true;
          }
        }
      }
    }

    // Mark section as completed if all its subsections are completed
    this.updateSectionCompletion();
  }

  /**
   * Update section completion status based on subsection completion
   */
  private updateSectionCompletion(): void {
    INTERVIEW_SCRIPT.forEach(section => {
      const allSubsectionsCompleted = section.subsections.every(
        subsection => this.completedSubsections[subsection.id] === true
      );
      
      if (allSubsectionsCompleted) {
        this.completedSections[section.id] = true;
      }
    });
  }

  /**
   * Get complete script state for UI overlay
   * 
   * @returns Current script state
   */
  getState(): ScriptState {
    const totalSections = INTERVIEW_SCRIPT.length;
    const totalSubsections = INTERVIEW_SCRIPT.reduce(
      (sum, section) => sum + section.subsections.length,
      0
    );
    
    const completedSectionsCount = Object.values(this.completedSections).filter(
      completed => completed === true
    ).length;
    
    const completedSubsectionsCount = Object.values(this.completedSubsections).filter(
      completed => completed === true
    ).length;

    // Calculate progress percentage
    // Weight: 50% sections, 50% subsections
    const sectionProgress = (completedSectionsCount / totalSections) * 50;
    const subsectionProgress = (completedSubsectionsCount / totalSubsections) * 50;
    const progress = Math.round(sectionProgress + subsectionProgress);

    return {
      currentSection: this.currentSection,
      completedSections: { ...this.completedSections },
      completedSubsections: { ...this.completedSubsections },
      currentSubsection: this.currentSubsection,
      progress,
      totalSections,
      totalSubsections,
      completedSectionsCount,
      completedSubsectionsCount,
      lastUpdate: this.lastUpdate
    };
  }

  /**
   * Reset tracker to initial state
   */
  reset(): void {
    this.currentSection = 1;
    this.currentSubsection = null;
    this.lastUpdate = Date.now();
    
    // Reset all completion statuses
    INTERVIEW_SCRIPT.forEach(section => {
      this.completedSections[section.id] = false;
      section.subsections.forEach(subsection => {
        this.completedSubsections[subsection.id] = false;
      });
    });
  }

  /**
   * Manually mark a subsection as completed
   * 
   * @param subsectionId - Subsection ID (e.g., "1.1")
   */
  markSubsectionCompleted(subsectionId: string): void {
    this.completedSubsections[subsectionId] = true;
    this.updateSectionCompletion();
    this.lastUpdate = Date.now();
  }

  /**
   * Manually mark a section as completed
   * 
   * @param sectionId - Section ID (1-6)
   */
  markSectionCompleted(sectionId: number): void {
    this.completedSections[sectionId] = true;
    this.lastUpdate = Date.now();
  }
}

