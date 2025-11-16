import { createContext, useContext, useEffect, useRef, useCallback, useState, ReactNode } from "react";
import { useTranscripts } from "@/contexts/TranscriptContext";
import { useScript } from "@/contexts/ScriptContext";
import type { ScriptState } from "@/hooks/useInterviewAnalysis";

const INTERVIEW_ANALYSIS_WS_URL = import.meta.env.VITE_INTERVIEW_ANALYSIS_WS_URL || "ws://localhost:8080";
const SEND_INTERVAL = 5000; // 5 seconds

interface AnalysisResult {
  contradiction: {
    contradiction_score: number;
    trend: string;
    contradictions: Array<{ message: string }>;
    label: string;
  };
  scriptTracking: {
    deviation: {
      deviation: boolean;
      type?: string;
      message?: string;
    };
    scriptState?: {
      progress?: number;
      currentSection?: number;
      currentSubsection?: string | null;
      completedSections?: Record<number, boolean>;
      completedSubsections?: Record<string, boolean>;
    };
  } | null;
  culturalFit: {
    cultural_score: number;
    trend: string;
    signals: Array<{ type: 'positive' | 'negative'; msg: string }>;
    label: 'High Fit' | 'Moderate Fit' | 'Low Fit' | 'At Risk';
  } | null;
  metadata: {
    chunkNumber: number;
    speaker: string;
    timestamp: number;
  };
}

export interface AnalysisFlag {
  id: string;
  isGreen: boolean;
  message: string;
}

interface InterviewAnalysisContextType {
  flags: AnalysisFlag[];
  scriptState: ScriptState | null;
  markSubsectionCompleted: (subsectionId: string) => void;
}

const InterviewAnalysisContext = createContext<InterviewAnalysisContextType | undefined>(undefined);

export function InterviewAnalysisProvider({ children }: { children: ReactNode }) {
  const { committedTranscripts } = useTranscripts();
  const { setScriptState: setContextScriptState } = useScript();

  const [flags, setFlags] = useState<AnalysisFlag[]>([]);
  const [scriptState, setScriptState] = useState<ScriptState | null>(null);

  // push script state into ScriptContext (consumed by Todos)
  useEffect(() => {
    if (scriptState) {
      setContextScriptState(scriptState);
    }
  }, [scriptState, setContextScriptState]);

  const wsRef = useRef<WebSocket | null>(null);
  const intervalRef = useRef<number | null>(null);
  const transcriptsRef = useRef(committedTranscripts);
  const lastSentTimestampRef = useRef<number>(0);
  const handleWebSocketMessageRef = useRef<(event: MessageEvent) => void>();
  const sendAccumulatedTranscriptsRef = useRef<() => void>();
  const reconnectTimeoutRef = useRef<number | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;
  const reconnectDelay = 3000;

  transcriptsRef.current = committedTranscripts;

  const convertResultsToFlags = useCallback((result: AnalysisResult): AnalysisFlag[] => {
    const newFlags: AnalysisFlag[] = [];
    const timestamp = Date.now();
    if (result.contradiction?.contradictions && result.contradiction.contradictions.length > 0) {
      result.contradiction.contradictions.forEach((contradiction, index) => {
        newFlags.push({
          id: `contradiction-${timestamp}-${index}`,
          isGreen: false,
          message: `Contradiction: ${contradiction.message || 'Inconsistency detected'}`,
        });
      });
    }
    if (result.culturalFit) {
      const { cultural_score, label, signals } = result.culturalFit;
      if (cultural_score < 50 || label === 'Low Fit' || label === 'At Risk') {
        newFlags.push({
          id: `cf-low-${timestamp}`,
          isGreen: false,
          message: `Low cultural fit: ${label} (score: ${cultural_score.toFixed(1)})`,
        });
      }
      if (cultural_score >= 70 || label === 'High Fit') {
        newFlags.push({
          id: `cf-high-${timestamp}`,
          isGreen: true,
          message: `High cultural fit: ${label} (score: ${cultural_score.toFixed(1)})`,
        });
      }
      signals.forEach((signal, index) => {
        newFlags.push({
          id: `cf-signal-${timestamp}-${index}`,
          isGreen: signal.type === 'positive',
          message: `${signal.type === 'positive' ? 'Cultural strength' : 'Cultural concern'}: ${signal.msg}`,
        });
      });
    }
    return newFlags;
  }, []);

  function mergeScriptProgress(prevState: ScriptState | null, incomingUnsafe: unknown): ScriptState | null {
    if (!incomingUnsafe) return prevState;
    const incoming = incomingUnsafe as {
      progress?: number;
      currentSection?: number;
      currentSubsection?: string | null;
      completedSections?: Record<number, boolean>;
      completedSubsections?: Record<string, boolean>;
    };
    const previous: ScriptState | null = prevState;
    const mergedCompletedSubsections: Record<string, boolean> = {
      ...(incoming.completedSubsections || {}),
    };
    const mergedCompletedSections: Record<number, boolean> = {
      ...(incoming.completedSections || {}),
    };
    if (previous?.completedSubsections) {
      Object.keys(previous.completedSubsections).forEach((key) => {
        if (previous.completedSubsections[key] === true) {
          mergedCompletedSubsections[key] = true;
        }
      });
    }
    if (previous?.completedSections) {
      Object.keys(previous.completedSections).forEach((key) => {
        const id = Number(key);
        if (previous.completedSections[id] === true) {
          mergedCompletedSections[id] = true;
        }
      });
    }
    const merged: ScriptState = {
      currentSection: Math.max(previous?.currentSection ?? 0, incoming.currentSection ?? 0),
      completedSections: mergedCompletedSections,
      completedSubsections: mergedCompletedSubsections,
      currentSubsection:
        incoming.currentSubsection !== undefined
          ? incoming.currentSubsection
          : previous?.currentSubsection ?? null,
      progress: Math.max(previous?.progress ?? 0, incoming.progress ?? 0),
    };
    return merged;
  }

  const handleWebSocketMessage = useCallback((event: MessageEvent) => {
    try {
      const data = JSON.parse(event.data);
      if (data.type === 'analysis_result' && data.payload) {
        const result: AnalysisResult = data.payload;
        const newFlags = convertResultsToFlags(result);
        if (newFlags.length > 0) {
          setFlags((prev) => [...newFlags, ...prev]);
        }
        if (result.scriptTracking?.scriptState) {
          setScriptState((prev) => mergeScriptProgress(prev, result.scriptTracking?.scriptState));
        }
      } else if (data.type === 'connection') {
        // connected
      } else if (data.type === 'script_state_update') {
        if (data.payload?.scriptState) {
          setScriptState((prev) => mergeScriptProgress(prev, data.payload.scriptState));
        }
      } else if (data.type === 'error') {
        console.error("Interview analysis error:", data.message);
      }
    } catch (e) {
      console.error("Error parsing analysis WS message:", e);
    }
  }, [convertResultsToFlags]);

  useEffect(() => {
    handleWebSocketMessageRef.current = handleWebSocketMessage;
  }, [handleWebSocketMessage]);

  const sendAccumulatedTranscripts = useCallback(() => {
    const committed = transcriptsRef.current;
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    const now = Date.now();
    const thirtySecondsAgo = now - 30000;
    const hasTimestamps = committed.some(t => t.timestamp !== undefined);
    let recent = committed;
    if (hasTimestamps) {
      recent = committed.filter((t, _, arr) => {
        if (!t.timestamp) return false;
        const isRecent = t.timestamp >= thirtySecondsAgo;
        const isMostRecent = t === arr[arr.length - 1];
        return isRecent || isMostRecent;
      });
      if (recent.length === 0 && committed.length > 0) {
        recent = committed.slice(-3);
      }
    }
    if (recent.length === 0) return;
    const candidateText = recent.filter(t => t.source === 'tab' || !t.source).map(t => t.text).join(' ').trim();
    const recruiterText = recent.filter(t => t.source === 'microphone').map(t => t.text).join(' ').trim();
    if (candidateText.length > 0) {
      wsRef.current.send(JSON.stringify({ type: 'transcript_chunk', payload: { chunk: candidateText, speaker: 'candidate' } }));
    }
    if (recruiterText.length > 0) {
      wsRef.current.send(JSON.stringify({ type: 'transcript_chunk', payload: { chunk: recruiterText, speaker: 'recruiter' } }));
    }
    const last = recent[recent.length - 1];
    lastSentTimestampRef.current = last.timestamp ?? now;
  }, []);

  useEffect(() => {
    sendAccumulatedTranscriptsRef.current = sendAccumulatedTranscripts;
  }, [sendAccumulatedTranscripts]);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    try {
      const url = new URL(INTERVIEW_ANALYSIS_WS_URL);
      if (!['ws:', 'wss:'].includes(url.protocol)) {
        console.error("Invalid WS URL scheme");
        return;
      }
    } catch (e) {
      console.error("Invalid WS URL:", INTERVIEW_ANALYSIS_WS_URL);
      return;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    try {
      const ws = new WebSocket(INTERVIEW_ANALYSIS_WS_URL);
      wsRef.current = ws;
      ws.onopen = () => {
        reconnectAttemptsRef.current = 0;
        setTimeout(() => {
          if (transcriptsRef.current.length > 0 && sendAccumulatedTranscriptsRef.current) {
            sendAccumulatedTranscriptsRef.current();
          }
        }, 100);
      };
      ws.onmessage = (event) => {
        if (handleWebSocketMessageRef.current) {
          handleWebSocketMessageRef.current(event);
        }
      };
      ws.onerror = (error) => console.error("Interview analysis WS error:", error);
      ws.onclose = (event) => {
        wsRef.current = null;
        if (event.code !== 1000 && reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current++;
          reconnectTimeoutRef.current = window.setTimeout(() => connect(), reconnectDelay);
        }
      };
    } catch (e) {
      console.error("Error creating WS connection:", e);
    }
  }, []);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      if (wsRef.current) {
        wsRef.current.close(1000, "Unmount");
        wsRef.current = null;
      }
    };
  }, [connect]);

  useEffect(() => {
    intervalRef.current = window.setInterval(() => {
      if (sendAccumulatedTranscriptsRef.current) {
        sendAccumulatedTranscriptsRef.current();
      }
    }, SEND_INTERVAL);
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (committedTranscripts.length > 0 && wsRef.current?.readyState === WebSocket.OPEN && sendAccumulatedTranscriptsRef.current) {
      const timeoutId = setTimeout(() => {
        if (sendAccumulatedTranscriptsRef.current) {
          sendAccumulatedTranscriptsRef.current();
        }
      }, 500);
      return () => clearTimeout(timeoutId);
    }
  }, [committedTranscripts.length]);

  const markSubsectionCompleted = useCallback((subsectionId: string) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      console.error("WS not connected, cannot mark subsection");
      return;
    }
    const message = { type: 'mark_subsection_completed', payload: { subsectionId } };
    wsRef.current.send(JSON.stringify(message));
  }, []);

  return (
    <InterviewAnalysisContext.Provider value={{ flags, scriptState, markSubsectionCompleted }}>
      {children}
    </InterviewAnalysisContext.Provider>
  );
}

export function useInterviewAnalysisContext() {
  const ctx = useContext(InterviewAnalysisContext);
  if (!ctx) throw new Error("useInterviewAnalysisContext must be used within InterviewAnalysisProvider");
  return ctx;
}


