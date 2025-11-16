import { useInterviewAnalysisContext } from "@/contexts/InterviewAnalysisContext";

// This hook now simply reads from global InterviewAnalysisContext

export interface ScriptState {
  currentSection: number;
  completedSections: Record<number, boolean>;
  completedSubsections: Record<string, boolean>;
  currentSubsection: string | null;
  progress: number;
}

export function useInterviewAnalysis() {
  const { flags, scriptState, markSubsectionCompleted } = useInterviewAnalysisContext();
  return { flags, scriptState, markSubsectionCompleted };
}

