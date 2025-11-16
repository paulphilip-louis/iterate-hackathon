import { useEffect, useRef, useCallback, useState } from "react";
import { useTranscripts } from "@/contexts/TranscriptContext";
import { useScript } from "@/contexts/ScriptContext";
import type { Transcript } from "@/contexts/TranscriptContext";

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
    scriptState: {
      progress: number;
      currentSection: number;
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

interface Flag {
  id: string;
  isGreen: boolean;
  message: string;
}

export interface ScriptState {
  currentSection: number;
  completedSections: Record<number, boolean>;
  completedSubsections: Record<string, boolean>;
  currentSubsection: string | null;
  progress: number;
}

export function useInterviewAnalysis() {
  // Get transcripts directly from context instead of receiving as parameter
  const { committedTranscripts } = useTranscripts();
  // Get script context to update it directly
  const { setScriptState: setContextScriptState } = useScript();
  
  console.log("🎯 useInterviewAnalysis hook initialized/re-rendered");
  console.log(`  Current transcripts count: ${committedTranscripts.length}`);
  if (committedTranscripts.length > 0) {
    console.log(`  First transcript:`, committedTranscripts[0]);
    console.log(`  Last transcript:`, committedTranscripts[committedTranscripts.length - 1]);
  }
  
  const [flags, setFlags] = useState<Flag[]>([]);
  const [scriptState, setScriptState] = useState<ScriptState | null>(null);
  
  // Update context whenever scriptState changes (so TodosTab can see it)
  useEffect(() => {
    if (scriptState) {
      console.log("🔄 useInterviewAnalysis: Updating ScriptContext with scriptState:", scriptState);
      console.log("   Current section:", scriptState.currentSection);
      console.log("   Completed subsections:", scriptState.completedSubsections);
      setContextScriptState(scriptState);
    }
  }, [scriptState, setContextScriptState]);
  const wsRef = useRef<WebSocket | null>(null);
  const intervalRef = useRef<number | null>(null);
  const lastSentTimestampRef = useRef<number>(0);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;
  const reconnectDelay = 3000;
  
  // Use refs to avoid recreating callbacks on every render
  const transcriptsRef = useRef(committedTranscripts);
  const handleWebSocketMessageRef = useRef<(event: MessageEvent) => void>();
  const sendAccumulatedTranscriptsRef = useRef<() => void>();
  
  // Update ref immediately when transcripts change (synchronous)
  transcriptsRef.current = committedTranscripts;
  
  // Log when transcripts change
  useEffect(() => {
    console.log(`📊 Transcripts ref updated: ${committedTranscripts.length} transcripts`);
    if (committedTranscripts.length > 0) {
      console.log(`  First:`, committedTranscripts[0]);
      console.log(`  Last:`, committedTranscripts[committedTranscripts.length - 1]);
    }
  }, [committedTranscripts]);

  // Convert analysis results to flags
  const convertResultsToFlags = useCallback((result: AnalysisResult): Flag[] => {
    const newFlags: Flag[] = [];
    const timestamp = Date.now();

    // Red Flags
    if (result.contradiction?.contradictions && result.contradiction.contradictions.length > 0) {
      result.contradiction.contradictions.forEach((contradiction, index) => {
        newFlags.push({
          id: `contradiction-${timestamp}-${index}`,
          isGreen: false,
          message: `Contradiction: ${contradiction.message || 'Inconsistency detected'}`,
        });
      });
    }

    // Cultural Fit flags
    if (result.culturalFit) {
      const { cultural_score, label, signals } = result.culturalFit;

      // Red flags for low cultural fit
      if (cultural_score < 50 || label === 'Low Fit' || label === 'At Risk') {
        newFlags.push({
          id: `cultural-fit-low-${timestamp}`,
          isGreen: false,
          message: `Low cultural fit: ${label} (score: ${cultural_score.toFixed(1)})`,
        });
      }

      // Green flags for high cultural fit
      if (cultural_score >= 70 || label === 'High Fit') {
        newFlags.push({
          id: `cultural-fit-high-${timestamp}`,
          isGreen: true,
          message: `High cultural fit: ${label} (score: ${cultural_score.toFixed(1)})`,
        });
      }

      // Process cultural signals
      signals.forEach((signal, index) => {
        if (signal.type === 'negative') {
          newFlags.push({
            id: `cultural-signal-negative-${timestamp}-${index}`,
            isGreen: false,
            message: `Cultural concern: ${signal.msg}`,
          });
        } else if (signal.type === 'positive') {
          newFlags.push({
            id: `cultural-signal-positive-${timestamp}-${index}`,
            isGreen: true,
            message: `Cultural strength: ${signal.msg}`,
          });
        }
      });
    }

    return newFlags;
  }, []);

  // Handle WebSocket messages
  const handleWebSocketMessage = useCallback((event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === 'analysis_result' && data.payload) {
          console.log("📥 Received analysis result:", data.payload);
          const result: AnalysisResult = data.payload;
          const newFlags = convertResultsToFlags(result);
          
          console.log(`🏁 Converted to ${newFlags.length} flags:`, newFlags);
          
          if (newFlags.length > 0) {
            setFlags((prev) => {
              const updated = [...newFlags, ...prev];
              console.log(`📋 Total flags now: ${updated.length}`);
              return updated;
            });
          }

          // Update script state if available (for Todos tab)
          if (result.scriptTracking?.scriptState) {
            console.log("📋 Updating script state:", result.scriptTracking.scriptState);
            console.log("   Current section:", result.scriptTracking.scriptState.currentSection);
            console.log("   Current subsection:", result.scriptTracking.scriptState.currentSubsection);
            console.log("   Completed sections:", result.scriptTracking.scriptState.completedSections);
            console.log("   Completed subsections:", result.scriptTracking.scriptState.completedSubsections);
            console.log("   Progress:", result.scriptTracking.scriptState.progress);
            
            // IMPORTANT: Preserve previously completed subsections - once checked, never unchecked
            setScriptState((prevState) => {
              const newCompletedSubsections = { ...(result.scriptTracking.scriptState.completedSubsections || {}) };
              
              // Merge with previous state: keep all previously completed subsections
              if (prevState?.completedSubsections) {
                Object.keys(prevState.completedSubsections).forEach((key) => {
                  if (prevState.completedSubsections[key] === true) {
                    // Preserve completed status - never uncheck
                    newCompletedSubsections[key] = true;
                  }
                });
              }
              
              // Create a NEW object to ensure React detects the change
              const newScriptState: ScriptState = {
                currentSection: result.scriptTracking.scriptState.currentSection,
                completedSections: { ...(result.scriptTracking.scriptState.completedSections || {}) },
                completedSubsections: newCompletedSubsections, // Use merged completed subsections
                currentSubsection: result.scriptTracking.scriptState.currentSubsection,
                progress: result.scriptTracking.scriptState.progress,
              };
              
              console.log("   Merged completed subsections (preserving all checked):", newCompletedSubsections);
              console.log("   Setting script state (NEW OBJECT):", newScriptState);
              console.log("   Previous script state:", prevState);
              
              return newScriptState;
            });
          } else {
            console.log("⚠️ No scriptTracking.scriptState in result");
            console.log("   scriptTracking:", result.scriptTracking);
          }
               } else if (data.type === 'connection') {
                 console.log("✅ Connected to interview analysis service");
               } else if (data.type === 'script_state_update') {
                 // Handle manual mark completion update
                 console.log("📋 Received script state update:", data.payload);
                 if (data.payload?.scriptState) {
                   // IMPORTANT: Preserve previously completed subsections
                   setScriptState((prevState) => {
                     const newCompletedSubsections = { ...(data.payload.scriptState.completedSubsections || {}) };
                     
                     // Merge with previous state: keep all previously completed subsections
                     if (prevState?.completedSubsections) {
                       Object.keys(prevState.completedSubsections).forEach((key) => {
                         if (prevState.completedSubsections[key] === true) {
                           // Preserve completed status - never uncheck
                           newCompletedSubsections[key] = true;
                         }
                       });
                     }
                     
                     return {
                       currentSection: data.payload.scriptState.currentSection,
                       completedSections: data.payload.scriptState.completedSections,
                       completedSubsections: newCompletedSubsections, // Use merged
                       currentSubsection: data.payload.scriptState.currentSubsection,
                       progress: data.payload.scriptState.progress,
                     };
                   });
                 }
               } else if (data.type === 'error') {
                 console.error("❌ Interview analysis error:", data.message);
               }
      } catch (error) {
        console.error("Error parsing WebSocket message:", error);
      }
    },
    [convertResultsToFlags]
  );
  
  // Update ref when handler changes
  useEffect(() => {
    handleWebSocketMessageRef.current = handleWebSocketMessage;
  }, [handleWebSocketMessage]);

  // Send accumulated transcripts
  const sendAccumulatedTranscripts = useCallback(() => {
    // Always read the latest transcripts from the ref (which is kept in sync)
    const committedTranscripts = transcriptsRef.current;
    
    console.log("🔄 sendAccumulatedTranscripts called");
    console.log(`  WebSocket ref exists: ${wsRef.current !== null}`);
    console.log(`  WebSocket state: ${wsRef.current?.readyState} (OPEN=${WebSocket.OPEN})`);
    console.log(`  Transcripts ref count: ${committedTranscripts.length}`);
    
    if (!wsRef.current) {
      console.log("⚠️ WebSocket ref is null, skipping send");
      return;
    }
    
    if (wsRef.current.readyState !== WebSocket.OPEN) {
      console.log(`⚠️ WebSocket not open (state: ${wsRef.current.readyState}), skipping send`);
      return;
    }

    const now = Date.now();
    const fiveSecondsAgo = now - 5000;
    const thirtySecondsAgo = now - 30000; // Extended window for safety

    console.log(`📊 Total transcripts: ${committedTranscripts.length}`);
    console.log(`📊 Now: ${new Date(now).toLocaleTimeString()}, Checking from: ${new Date(fiveSecondsAgo).toLocaleTimeString()}`);

    // Debug: log all transcripts with time differences
    if (committedTranscripts.length > 0) {
      console.log("📋 All transcripts:");
      committedTranscripts.forEach((t, i) => {
        const timeDiff = t.timestamp ? now - t.timestamp : null;
        const timeDiffSeconds = timeDiff ? (timeDiff / 1000).toFixed(1) : 'N/A';
        console.log(`  [${i}] id=${t.id}, text="${t.text.substring(0, 30)}${t.text.length > 30 ? '...' : ''}", timestamp=${t.timestamp || 'none'}, age=${timeDiffSeconds}s, source=${t.source || 'none'}`);
      });
    }

    // Check if transcripts have timestamps
    const hasTimestamps = committedTranscripts.some(t => t.timestamp !== undefined);
    console.log(`📊 Has timestamps: ${hasTimestamps}`);

    // Filter transcripts from the last 30 seconds (more lenient) OR use all if no timestamps
    let recentTranscripts;
    if (!hasTimestamps) {
      // If no timestamps, use all transcripts (fallback)
      console.log("⚠️ No timestamps found, using all transcripts");
      recentTranscripts = committedTranscripts;
    } else {
      // Use a more lenient window (30 seconds) to catch transcripts that might have been delayed
      recentTranscripts = committedTranscripts.filter(
        (transcript) => {
          if (!transcript.timestamp) return false;
          // Check if transcript is within last 30 seconds OR if it's the most recent one
          const isRecent = transcript.timestamp >= thirtySecondsAgo;
          const isMostRecent = transcript === committedTranscripts[committedTranscripts.length - 1];
          return isRecent || isMostRecent;
        }
      );
      
      // If still no recent transcripts, use the last few transcripts as fallback
      if (recentTranscripts.length === 0 && committedTranscripts.length > 0) {
        console.log("⚠️ No transcripts in 30s window, using last 3 transcripts as fallback");
        recentTranscripts = committedTranscripts.slice(-3);
      }
    }

    console.log(`📊 Recent transcripts (last 5s or all): ${recentTranscripts.length}`);

    // Skip if no transcripts
    if (recentTranscripts.length === 0) {
      console.log("⏭️ No transcripts to send");
      return;
    }

    // Check if we already sent these (only if we have timestamps)
    if (hasTimestamps) {
      const lastTranscript = recentTranscripts[recentTranscripts.length - 1];
      if (lastTranscript.timestamp === lastSentTimestampRef.current) {
        console.log("⏭️ Already sent these transcripts");
        return;
      }
    }

    // Group by speaker
    const candidateTranscripts = recentTranscripts.filter(
      (t) => t.source === 'tab' || !t.source
    );
    const recruiterTranscripts = recentTranscripts.filter(
      (t) => t.source === 'microphone'
    );

    console.log(`📊 Candidate transcripts: ${candidateTranscripts.length}, Recruiter transcripts: ${recruiterTranscripts.length}`);

    // Send candidate transcripts
    if (candidateTranscripts.length > 0) {
      const candidateText = candidateTranscripts
        .map((t) => t.text)
        .join(' ')
        .trim();

      if (candidateText.length > 0) {
        const message = {
          type: 'transcript_chunk',
          payload: {
            chunk: candidateText,
            speaker: 'candidate',
          },
        };
        const messageStr = JSON.stringify(message);
        console.log(`📤 Sending candidate chunk (${candidateText.length} chars):`, messageStr.substring(0, 200));
        try {
          wsRef.current.send(messageStr);
          console.log(`✅ Successfully sent candidate chunk`);
        } catch (error) {
          console.error(`❌ Error sending candidate chunk:`, error);
        }
      } else {
        console.log(`⏭️ Skipping candidate chunk: empty text`);
      }
    } else {
      console.log(`⏭️ No candidate transcripts to send`);
    }

    // Send recruiter transcripts
    if (recruiterTranscripts.length > 0) {
      const recruiterText = recruiterTranscripts
        .map((t) => t.text)
        .join(' ')
        .trim();

      if (recruiterText.length > 0) {
        const message = {
          type: 'transcript_chunk',
          payload: {
            chunk: recruiterText,
            speaker: 'recruiter',
          },
        };
        const messageStr = JSON.stringify(message);
        console.log(`📤 Sending recruiter chunk (${recruiterText.length} chars):`, messageStr.substring(0, 200));
        try {
          wsRef.current.send(messageStr);
          console.log(`✅ Successfully sent recruiter chunk`);
        } catch (error) {
          console.error(`❌ Error sending recruiter chunk:`, error);
        }
      } else {
        console.log(`⏭️ Skipping recruiter chunk: empty text`);
      }
    } else {
      console.log(`⏭️ No recruiter transcripts to send`);
    }

    // Update last sent timestamp
    if (recentTranscripts.length > 0) {
      const lastTranscript = recentTranscripts[recentTranscripts.length - 1];
      if (lastTranscript.timestamp) {
        lastSentTimestampRef.current = lastTranscript.timestamp;
      } else {
        // If no timestamp, use current time to prevent immediate re-send
        lastSentTimestampRef.current = now;
      }
    }
  }, []); // Empty deps - uses ref for transcripts
  
  // Update ref when function changes
  useEffect(() => {
    sendAccumulatedTranscriptsRef.current = sendAccumulatedTranscripts;
  }, [sendAccumulatedTranscripts]);

  // Connect to WebSocket
  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      console.log("🔌 WebSocket already connected, skipping");
      return;
    }
    
    if (wsRef.current) {
      console.log("🔌 WebSocket exists but not open, closing first");
      wsRef.current.close();
      wsRef.current = null;
    }

    if (!INTERVIEW_ANALYSIS_WS_URL || typeof INTERVIEW_ANALYSIS_WS_URL !== 'string') {
      console.warn("⚠️ INTERVIEW_ANALYSIS_WS_URL is not configured.");
      return;
    }

    try {
      const url = new URL(INTERVIEW_ANALYSIS_WS_URL);
      if (!['ws:', 'wss:'].includes(url.protocol)) {
        console.error("❌ Invalid WebSocket URL scheme. Must be 'ws://' or 'wss://'");
        return;
      }
    } catch (error) {
      console.error("❌ Invalid WebSocket URL format:", INTERVIEW_ANALYSIS_WS_URL);
      return;
    }

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    try {
      console.log("🔌 Connecting to interview analysis service:", INTERVIEW_ANALYSIS_WS_URL);
      const ws = new WebSocket(INTERVIEW_ANALYSIS_WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log("✅ Connected to interview analysis service");
        reconnectAttemptsRef.current = 0;
        // Try to send immediately if there are transcripts
        setTimeout(() => {
          if (transcriptsRef.current.length > 0 && sendAccumulatedTranscriptsRef.current) {
            console.log("📤 Triggering immediate send after connection");
            sendAccumulatedTranscriptsRef.current();
          }
        }, 100);
      };

      ws.onmessage = (event) => {
        if (handleWebSocketMessageRef.current) {
          handleWebSocketMessageRef.current(event);
        }
      };

      ws.onerror = (error) => {
        console.error("❌ Interview analysis WebSocket error:", error);
      };

      ws.onclose = (event) => {
        console.log("🔌 Interview analysis WebSocket closed", event.code, event.reason);
        wsRef.current = null;

        if (event.code !== 1000 && reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current++;
          console.log(
            `🔄 Attempting to reconnect (${reconnectAttemptsRef.current}/${maxReconnectAttempts})...`
          );
          reconnectTimeoutRef.current = window.setTimeout(() => {
            connect();
          }, reconnectDelay);
        } else if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
          console.error("❌ Max reconnection attempts reached.");
        }
      };
    } catch (error) {
      console.error("❌ Error creating WebSocket connection:", error);
    }
  }, []); // Empty deps - uses refs for callbacks

  // Setup connection (only once)
  useEffect(() => {
    console.log("🔌 Setting up interview analysis hook - connection");
    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      if (wsRef.current) {
        console.log("🔌 Closing WebSocket connection (cleanup)");
        wsRef.current.close(1000, "Component unmounting");
        wsRef.current = null;
      }
    };
  }, [connect]);

  // Setup interval (separate effect, uses ref for callback)
  useEffect(() => {
    console.log("⏰ Setting up interval for sending transcripts");
    
    // Setup interval to send transcripts every 5 seconds
    intervalRef.current = window.setInterval(() => {
      console.log("⏰ Interval triggered - checking for transcripts to send");
      if (sendAccumulatedTranscriptsRef.current) {
        sendAccumulatedTranscriptsRef.current();
      }
    }, SEND_INTERVAL);

    console.log(`⏰ Interval set to ${SEND_INTERVAL}ms`);

    return () => {
      if (intervalRef.current) {
        console.log("⏰ Clearing interval");
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, []); // Empty deps - uses ref for callback

  // Force send when transcripts are added (if WebSocket is open)
  useEffect(() => {
    if (committedTranscripts.length > 0 && wsRef.current?.readyState === WebSocket.OPEN && sendAccumulatedTranscriptsRef.current) {
      console.log(`📬 Transcripts changed (${committedTranscripts.length} total), triggering send...`);
      // Small delay to ensure WebSocket is ready
      const timeoutId = setTimeout(() => {
        if (sendAccumulatedTranscriptsRef.current) {
          sendAccumulatedTranscriptsRef.current();
        }
      }, 500);
      return () => clearTimeout(timeoutId);
    }
  }, [committedTranscripts.length]);

  /**
   * Manually mark a subsection as completed
   */
  const markSubsectionCompleted = useCallback((subsectionId: string) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      console.error("❌ WebSocket not connected, cannot mark subsection");
      return;
    }

    const message = {
      type: 'mark_subsection_completed',
      payload: {
        subsectionId,
      },
    };

    console.log(`📤 Sending manual mark completion for subsection ${subsectionId}`);
    wsRef.current.send(JSON.stringify(message));
  }, []);

  return { flags, scriptState, markSubsectionCompleted };
}

