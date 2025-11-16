import {
  createContext,
  useContext,
  useState,
  ReactNode,
  useCallback,
} from "react";

export interface Flag {
  id: string;
  isGreen: boolean;
  message: string;
}

export interface SuggestedQuestion {
  id: string;
  message: string;
}

export interface Define {
  id: string;
  message: string;
}

interface MeetingEventsContextType {
  questions: SuggestedQuestion[];
  flags: Flag[];
  defines: Define[];
  addQuestion: (question: string) => void;
  addFlag: (isGreen: boolean, message: string) => void;
  addDefine: (term: string, definition: string) => void;
  clearAll: () => void;
}

const MeetingEventsContext = createContext<
  MeetingEventsContextType | undefined
>(undefined);

export function MeetingEventsProvider({ children }: { children: ReactNode }) {
  const [questions, setQuestions] = useState<SuggestedQuestion[]>([]);
  const [flags, setFlags] = useState<Flag[]>([]);
  const [defines, setDefines] = useState<Define[]>([]);

  const addQuestion = useCallback((question: string) => {
    const newQuestion: SuggestedQuestion = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
      message: question,
    };
    setQuestions((prev) => [newQuestion, ...prev]);
  }, []);

  const addFlag = useCallback((isGreen: boolean, message: string) => {
    const newFlag: Flag = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
      isGreen,
      message,
    };
    setFlags((prev) => [newFlag, ...prev]);
  }, []);

  const addDefine = useCallback((term: string, definition: string) => {
    console.log("📚 addDefine called:", { term, definition });
    const newDefine: Define = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
      message: `${term}: ${definition}`,
    };
    console.log("📚 New define object:", newDefine);
    setDefines((prev) => {
      const updated = [newDefine, ...prev];
      console.log("📚 Updated defines array:", updated);
      return updated;
    });
  }, []);

  const clearAll = useCallback(() => {
    setQuestions([]);
    setFlags([]);
    setDefines([]);
  }, []);

  return (
    <MeetingEventsContext.Provider
      value={{
        questions,
        flags,
        defines,
        addQuestion,
        addFlag,
        addDefine,
        clearAll,
      }}
    >
      {children}
    </MeetingEventsContext.Provider>
  );
}

export function useMeetingEvents() {
  const context = useContext(MeetingEventsContext);
  if (context === undefined) {
    throw new Error(
      "useMeetingEvents must be used within a MeetingEventsProvider"
    );
  }
  return context;
}
