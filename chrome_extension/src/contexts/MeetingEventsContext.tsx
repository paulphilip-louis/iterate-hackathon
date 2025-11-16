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
      id: Date.now().toString(),
      message: question,
    };
    setQuestions((prev) => [newQuestion, ...prev]);
  }, []);

  const addFlag = useCallback((isGreen: boolean, message: string) => {
    const newFlag: Flag = {
      id: Date.now().toString(),
      isGreen,
      message,
    };
    setFlags((prev) => [newFlag, ...prev]);
  }, []);

  const addDefine = useCallback((term: string, definition: string) => {
    const newDefine: Define = {
      id: Date.now().toString(),
      message: `${term}: ${definition}`,
    };
    setDefines((prev) => [newDefine, ...prev]);
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

