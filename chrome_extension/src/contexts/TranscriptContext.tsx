import {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect,
} from "react";
import { globalCaptureManager } from "@/utils/globalCaptureManager";
import {
  sendToQuestionGen,
  connectToQuestionGen,
} from "@/utils/questionGenWebSocket";
import { transcriptChunkSchema } from "@/schemas/meetingEvents";

export type TranscriptSource = "tab" | "microphone";

export interface Transcript {
  id: string;
  text: string;
  timestamp?: number;
  source?: TranscriptSource;
}

interface TranscriptContextType {
  partialTranscript: string;
  committedTranscripts: Transcript[];
  setPartialTranscript: (text: string) => void;
  addCommittedTranscript: (transcript: Transcript) => void;
  clearTranscripts: () => void;
}

const TranscriptContext = createContext<TranscriptContextType | undefined>(
  undefined
);

export function TranscriptProvider({ children }: { children: ReactNode }) {
  const [partialTranscript, setPartialTranscript] = useState<string>("");
  const [committedTranscripts, setCommittedTranscripts] = useState<
    Transcript[]
  >([]);

  const addCommittedTranscript = (transcript: Transcript) => {
    // Skip empty strings
    if (!transcript.text || transcript.text.trim().length === 0) {
      console.log("⏭️ Skipping empty transcript");
      return;
    }
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
    // Only set non-empty partial transcripts, or clear if empty
    if (!text || text.trim().length === 0) {
      setPartialTranscript("");
      return;
    }
    console.log("📝 Setting partial transcript:", text);
    setPartialTranscript(text);
  };

  // Wrapper for adding committed transcript
  const addCommittedTranscriptWrapper = (transcript: Transcript) => {
    // Skip empty strings
    if (!transcript.text || transcript.text.trim().length === 0) {
      return;
    }

    const committedTranscript = {
      id: transcript.id || Date.now().toString(),
      text: transcript.text,
      timestamp: transcript.timestamp || Date.now(),
      source: transcript.source, // Preserve source
    };

    addCommittedTranscript(committedTranscript);

    // Send transcript chunk to question generation service
    try {
      const transcriptChunk = transcriptChunkSchema.parse({
        event: "TRANSCRIPT_CHUNK",
        payload: transcript.text,
      });

      // Ensure connection and send
      connectToQuestionGen()
        .then(() => {
          sendToQuestionGen(transcriptChunk);
          console.log(
            "📤 Sent transcript chunk to question generation service:",
            transcript.text
          );
        })
        .catch((error) => {
          console.error("❌ Failed to send transcript chunk:", error);
        });
    } catch (error) {
      console.error("❌ Error creating transcript chunk:", error);
    }
  };

  // Update global callbacks immediately when provider mounts
  // and whenever context functions change
  // This ensures scribe always uses the current context functions
  useEffect(() => {
    globalCaptureManager.setTranscriptCallbacks(
      setPartialTranscriptWithLog,
      addCommittedTranscriptWrapper
    );
    console.log(
      "✅ Updated global transcript callbacks from TranscriptProvider",
      {
        partialLength: partialTranscript.length,
        committedCount: committedTranscripts.length,
      }
    );
  });

  // Also update on every render to ensure callbacks are always fresh
  // This runs on every render but that's okay - it just updates references

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
