import { createContext, useContext, useState, ReactNode } from "react";

interface Transcript {
  id: string;
  text: string;
  timestamp?: number;
}

interface TranscriptContextType {
  partialTranscript: string;
  committedTranscripts: Transcript[];
  setPartialTranscript: (text: string) => void;
  addCommittedTranscript: (transcript: Transcript) => void;
  clearTranscripts: () => void;
}

const TranscriptContext = createContext<TranscriptContextType | undefined>(undefined);

export function TranscriptProvider({ children }: { children: ReactNode }) {
  const [partialTranscript, setPartialTranscript] = useState<string>("");
  const [committedTranscripts, setCommittedTranscripts] = useState<Transcript[]>([]);

  const addCommittedTranscript = (transcript: Transcript) => {
    console.log("➕ Adding committed transcript:", transcript);
    setCommittedTranscripts((prev) => {
      const updated = [...prev, transcript];
      console.log("   Updated committed transcripts:", updated);
      return updated;
    });
  };

  const clearTranscripts = () => {
    console.log("🗑️ Clearing all transcripts");
    setPartialTranscript("");
    setCommittedTranscripts([]);
  };

  // Wrapper to log when partial transcript is set
  const setPartialTranscriptWithLog = (text: string) => {
    console.log("📝 Setting partial transcript:", text);
    setPartialTranscript(text);
  };

  return (
    <TranscriptContext.Provider
      value={{
        partialTranscript,
        committedTranscripts,
        setPartialTranscript: setPartialTranscriptWithLog,
        addCommittedTranscript,
        clearTranscripts,
      }}
    >
      {children}
    </TranscriptContext.Provider>
  );
}

export function useTranscripts() {
  const context = useContext(TranscriptContext);
  if (context === undefined) {
    throw new Error("useTranscripts must be used within a TranscriptProvider");
  }
  return context;
}

