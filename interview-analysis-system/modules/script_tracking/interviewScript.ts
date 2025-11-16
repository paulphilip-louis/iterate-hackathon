/**
 * Interview Script Definition
 * 
 * Hardcoded reference script for interview tracking.
 * Contains 5 main sections with their subsections.
 */

export type Section = {
  id: number;
  name: string;
  subsections: { id: string; label: string }[];
};

/**
 * Complete interview script structure
 */
export const INTERVIEW_SCRIPT: Section[] = [
  {
    id: 1,
    name: 'Personal Background',
    subsections: [
      { id: '1.1', label: 'Personal introduction' },
      { id: '1.2', label: 'Professional background summary' },
      { id: '1.3', label: 'Motivations & ambitions' },
      { id: '1.4', label: 'What they\'re looking for in a work environment' }
    ]
  },
  {
    id: 2,
    name: 'Company & Role Fit',
    subsections: [
      { id: '2.1', label: 'Why our company?' },
      { id: '2.2', label: 'Motivation for the role' },
      { id: '2.3', label: 'What they already know about the team / product' },
      { id: '2.4', label: 'Culture / management expectations' }
    ]
  },
  {
    id: 3,
    name: 'Technical Evaluation',
    subsections: [
      { id: '3.1', label: 'Technical project experience' },
      { id: '3.2', label: 'Architecture & design' },
      { id: '3.3', label: 'Specific skills' },
      { id: '3.4', label: 'Problem solving' }
    ]
  },
  {
    id: 4,
    name: 'Candidate Questions',
    subsections: [
      { id: '4.1', label: 'Questions about the team' },
      { id: '4.2', label: 'Questions about the roadmap' },
      { id: '4.3', label: 'Questions about compensation / process' }
    ]
  },
  {
    id: 5,
    name: 'Closing',
    subsections: [
      { id: '5.1', label: 'Summary' },
      { id: '5.2', label: 'Next steps' },
      { id: '5.3', label: 'Thank you / closing remarks' }
    ]
  }
];

/**
 * Get section by ID
 */
export function getSectionById(id: number): Section | undefined {
  return INTERVIEW_SCRIPT.find(section => section.id === id);
}

/**
 * Get subsection by ID (e.g., "1.1", "2.3")
 */
export function getSubsectionById(subsectionId: string): { id: string; label: string; sectionId: number } | undefined {
  for (const section of INTERVIEW_SCRIPT) {
    const subsection = section.subsections.find(sub => sub.id === subsectionId);
    if (subsection) {
      return {
        ...subsection,
        sectionId: section.id
      };
    }
  }
  return undefined;
}

/**
 * Get all subsection IDs
 */
export function getAllSubsectionIds(): string[] {
  return INTERVIEW_SCRIPT.flatMap(section => 
    section.subsections.map(sub => sub.id)
  );
}

/**
 * Get section name by ID
 */
export function getSectionName(id: number): string | undefined {
  return getSectionById(id)?.name;
}

/**
 * Get subsection label by ID
 */
export function getSubsectionLabel(subsectionId: string): string | undefined {
  return getSubsectionById(subsectionId)?.label;
}

