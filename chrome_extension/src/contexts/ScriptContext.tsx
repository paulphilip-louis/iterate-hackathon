import { createContext, useContext, useState, ReactNode, useEffect } from "react";
import type { ScriptState } from "@/hooks/useInterviewAnalysis";

interface ScriptContextType {
  scriptState: ScriptState | null;
  setScriptState: (state: ScriptState | null) => void;
}

const ScriptContext = createContext<ScriptContextType | undefined>(undefined);

export function ScriptProvider({ children }: { children: ReactNode }) {
  const [scriptState, setScriptState] = useState<ScriptState | null>(null);

  // Wrapper to log when script state is updated
  const setScriptStateWithLog = (state: ScriptState | null) => {
    console.log("📝 ScriptContext: setScriptState called with:", state);
    if (state) {
      console.log("   Current section:", state.currentSection);
      console.log("   Completed sections:", state.completedSections);
      console.log("   Completed subsections:", state.completedSubsections);
    }
    setScriptState(state);
  };

  // Log when scriptState changes
  useEffect(() => {
    console.log("📝 ScriptContext: scriptState changed:", scriptState);
  }, [scriptState]);

  return (
    <ScriptContext.Provider value={{ scriptState, setScriptState: setScriptStateWithLog }}>
      {children}
    </ScriptContext.Provider>
  );
}

export function useScript() {
  const context = useContext(ScriptContext);
  if (context === undefined) {
    throw new Error("useScript must be used within a ScriptProvider");
  }
  return context;
}

