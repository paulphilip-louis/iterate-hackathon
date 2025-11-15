import { useState, useEffect, useRef } from "react";
import { useScribe, AudioFormat } from "@elevenlabs/react";
import { getAudioStream, stopAudioCapture, getAudioLevel, requestMicrophonePermission, checkMicrophonePermission } from "@/utils/audioCapture";
import { useTranscripts } from "@/contexts/TranscriptContext";
import { globalCaptureManager } from "@/utils/globalCaptureManager";

export function useAudioCapture() {
  const [isCapturing, setIsCapturing] = useState(false);
  const [status, setStatus] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [microphonePermission, setMicrophonePermission] = useState<'granted' | 'denied' | 'prompt' | 'checking'>('checking');
  const audioLevelIntervalRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const commitIntervalRef = useRef<number | null>(null);
  const { setPartialTranscript, addCommittedTranscript } = useTranscripts();

  // Update global callbacks whenever they change so scribe always uses current context
  useEffect(() => {
    globalCaptureManager.setTranscriptCallbacks(
      setPartialTranscript,
      (transcript: any) => {
        addCommittedTranscript({
          id: transcript.id || Date.now().toString(),
          text: transcript.text,
          timestamp: transcript.timestamp || Date.now(),
        });
      }
    );
  }, [setPartialTranscript, addCommittedTranscript]);

  // Initialize ElevenLabs Scribe with callbacks that use global functions
  console.log("🎙️ [Scribe] Initializing Scribe instance...", {
    modelId: "scribe_v2_realtime",
    audioFormat: AudioFormat.PCM_16000,
    sampleRate: 16000,
  });
  
  const scribe = useScribe({
    modelId: "scribe_v2_realtime",
    audioFormat: AudioFormat.PCM_16000,
    sampleRate: 16000,
    
    // Session lifecycle callbacks
    onSessionStarted: () => {
      console.log("🚀 [Scribe] Session started", {
        timestamp: new Date().toISOString(),
      });
    },
    
    onConnect: () => {
      console.log("🔌 [Scribe] Connected to ElevenLabs WebSocket", {
        timestamp: new Date().toISOString(),
        status: scribe.status,
        isConnected: scribe.isConnected,
      });
    },
    
    onDisconnect: () => {
      console.log("🔌 [Scribe] Disconnected from ElevenLabs WebSocket", {
        timestamp: new Date().toISOString(),
        status: scribe.status,
        isConnected: scribe.isConnected,
      });
    },
    
    // Transcript callbacks
    onPartialTranscript: (data) => {
      console.log("📝 [Scribe] Partial transcript received:", {
        text: data.text,
        length: data.text?.length || 0,
        timestamp: new Date().toISOString(),
      });
      
      // Use global callback if available, otherwise use local
      const setPartial = globalCaptureManager.getSetPartialTranscript();
      if (setPartial) {
        console.log("✅ [Scribe] Using global callback for partial transcript");
        setPartial(data.text);
      } else {
        console.warn("⚠️ [Scribe] Global callback not available, using local callback");
        setPartialTranscript(data.text);
      }
    },
    
    onCommittedTranscript: (data) => {
      console.log("✅ [Scribe] Committed transcript received:", {
        id: (data as any).id,
        text: data.text,
        length: data.text?.length || 0,
        timestamp: new Date().toISOString(),
      });
      
      // Use global callback if available, otherwise use local
      const addCommitted = globalCaptureManager.getAddCommittedTranscript();
      if (addCommitted) {
        console.log("✅ [Scribe] Using global callback for committed transcript");
        addCommitted({
          id: (data as any).id || Date.now().toString(),
          text: data.text,
          timestamp: Date.now(),
        });
        // Clear partial when we get a committed transcript
        const setPartial = globalCaptureManager.getSetPartialTranscript();
        if (setPartial) {
          setPartial("");
        } else {
          setPartialTranscript("");
        }
      } else {
        console.warn("⚠️ [Scribe] Global callback not available, using local callback");
        addCommittedTranscript({
          id: (data as any).id || Date.now().toString(),
          text: data.text,
          timestamp: Date.now(),
        });
        setPartialTranscript("");
      }
    },
    
    onCommittedTranscriptWithTimestamps: (data) => {
      console.log("✅ [Scribe] Committed transcript with timestamps received:", {
        text: data.text,
        timestamps: data.timestamps,
        wordCount: data.timestamps?.length || 0,
        timestamp: new Date().toISOString(),
      });
      // We already handle this in onCommittedTranscript, but we log timestamps here
    },
    
    // Error callbacks
    onError: (error: Error | Event) => {
      console.error("❌ [Scribe] General error occurred:", {
        error,
        errorType: error instanceof Error ? "Error" : "Event",
        message: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString(),
      });
      setStatus(`Scribe error: ${error instanceof Error ? error.message : "Unknown error"}`);
    },
    
    onAuthError: (data: { error: string }) => {
      console.error("🔐 [Scribe] Authentication error:", {
        error: data.error,
        timestamp: new Date().toISOString(),
      });
      setStatus(`Authentication error: ${data.error}`);
      setIsCapturing(false);
    },
    
    onQuotaExceededError: (data: { error: string }) => {
      console.error("💳 [Scribe] Quota exceeded error:", {
        error: data.error,
        timestamp: new Date().toISOString(),
      });
      setStatus(`Quota exceeded: ${data.error}`);
      setIsCapturing(false);
    },
  });
  
  console.log("✅ [Scribe] Scribe instance created:", {
    isConnected: scribe.isConnected,
    status: scribe.status,
    isTranscribing: scribe.isTranscribing,
    error: scribe.error,
    partialTranscript: scribe.partialTranscript,
    committedTranscriptsCount: scribe.committedTranscripts?.length || 0,
    timestamp: new Date().toISOString(),
  });
  
  // Log status changes
  useEffect(() => {
    console.log("📊 [Scribe] Status changed:", {
      status: scribe.status,
      isConnected: scribe.isConnected,
      isTranscribing: scribe.isTranscribing,
      error: scribe.error,
      timestamp: new Date().toISOString(),
    });
  }, [scribe.status, scribe.isConnected, scribe.isTranscribing, scribe.error]);

  useEffect(() => {
    checkCaptureStatus();
    checkMicrophonePermissionStatus();
  }, []);

  const checkMicrophonePermissionStatus = async () => {
    try {
      const permission = await checkMicrophonePermission();
      setMicrophonePermission(permission);
    } catch (error) {
      console.error('Error checking microphone permission:', error);
      setMicrophonePermission('prompt');
    }
  };

  const requestMicrophonePermissionHandler = async () => {
    setLoading(true);
    setStatus('Requesting microphone permission...');
    try {
      await requestMicrophonePermission();
      setMicrophonePermission('granted');
      setStatus('Microphone permission granted!');
    } catch (error: any) {
      setMicrophonePermission('denied');
      setStatus(`Error: ${error.message || 'Failed to request microphone permission'}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Sync with global capture state when component mounts
    const syncWithGlobalCapture = async () => {
      // First check with background script
      const response = await chrome.runtime.sendMessage({
        action: "getCaptureStatus",
      });
      
      if (response && response.isCapturing && globalCaptureManager.isRunning()) {
        const globalStream = globalCaptureManager.getStream();
        const globalProcessor = globalCaptureManager.getProcessor();
        const globalAudioContext = globalCaptureManager.getAudioContext();
        const globalCommitInterval = globalCaptureManager.getCommitInterval();
        
      if (globalStream && globalProcessor && globalAudioContext) {
        console.log("🔄 [Scribe] Component mounting, detected global capture...");
        
        // Check scribe state
        const globalScribe = globalCaptureManager.getScribe();
        console.log("📊 [Scribe] Global scribe state on mount:", {
          hasInstance: !!globalScribe,
          isConnected: globalScribe?.isConnected || false,
          timestamp: new Date().toISOString(),
        });
        
        // Reconnect to global resources
        streamRef.current = globalStream;
        processorRef.current = globalProcessor;
        audioContextRef.current = globalAudioContext;
        
        console.log("🔗 [Scribe] Reconnected to global resources:", {
          hasStream: !!streamRef.current,
          hasProcessor: !!processorRef.current,
          hasAudioContext: !!audioContextRef.current,
        });
        
        if (globalCommitInterval) {
          commitIntervalRef.current = globalCommitInterval;
          console.log("⏱️ [Scribe] Reconnected to commit interval");
        }
        
        // Start a new audio level monitoring interval for this component
        // This updates the local state but doesn't interfere with global capture
        // The analyser is stored in captureState from audioCapture.ts and persists globally
        if (!audioLevelIntervalRef.current) {
          console.log("📊 [Scribe] Starting audio level monitoring interval");
          audioLevelIntervalRef.current = window.setInterval(() => {
            const level = getAudioLevel();
            setAudioLevel(level);
          }, 100);
        }
        
        setIsCapturing(true);
        setStatus("Capture is running globally");
        console.log("✅ [Scribe] Successfully synced with global capture state");
      }
      }
    };
    
    syncWithGlobalCapture();

    return () => {
      // Don't cleanup on unmount - let capture continue running globally
      // Only clear local interval, but keep global resources alive
      if (audioLevelIntervalRef.current) {
        clearInterval(audioLevelIntervalRef.current);
        audioLevelIntervalRef.current = null;
      }
      // Clear local refs but don't stop global resources
      processorRef.current = null;
      audioContextRef.current = null;
      streamRef.current = null;
      commitIntervalRef.current = null;
      // Don't stop the global capture - it should continue running
    };
  }, []);

  const checkCaptureStatus = async () => {
    try {
      const response = await chrome.runtime.sendMessage({
        action: "getCaptureStatus",
      });
      if (response && response.isCapturing && globalCaptureManager.isRunning()) {
        console.log("🔄 [Scribe] Detected global capture running, reconnecting...");
        setIsCapturing(true);
        setStatus("Capture is running globally");
        
        // Check scribe state
        const globalScribe = globalCaptureManager.getScribe();
        console.log("📊 [Scribe] Global scribe state:", {
          hasInstance: !!globalScribe,
          isConnected: globalScribe?.isConnected || false,
          timestamp: new Date().toISOString(),
        });
        
        // Reconnect to global resources
        const globalStream = globalCaptureManager.getStream();
        const globalProcessor = globalCaptureManager.getProcessor();
        const globalAudioContext = globalCaptureManager.getAudioContext();
        
        console.log("🔗 [Scribe] Reconnecting to global resources:", {
          hasStream: !!globalStream,
          hasProcessor: !!globalProcessor,
          hasAudioContext: !!globalAudioContext,
        });
        
        if (globalStream && globalProcessor && globalAudioContext) {
          streamRef.current = globalStream;
          processorRef.current = globalProcessor;
          audioContextRef.current = globalAudioContext;
          console.log("✅ [Scribe] Successfully reconnected to global resources");
        } else {
          console.warn("⚠️ [Scribe] Some global resources missing:", {
            stream: !!globalStream,
            processor: !!globalProcessor,
            audioContext: !!globalAudioContext,
          });
        }
        
        // Start monitoring audio levels if not already running
        if (!audioLevelIntervalRef.current) {
          console.log("📊 [Scribe] Starting audio level monitoring interval");
          audioLevelIntervalRef.current = window.setInterval(() => {
            const level = getAudioLevel();
            setAudioLevel(level);
          }, 100);
        }
      }
    } catch (error) {
      console.error("Error checking capture status:", error);
    }
  };

  const fetchToken = async (): Promise<string> => {
    try {
      const response = await fetch("http://localhost:3001/scribe-token");
      
      if (!response.ok) {
        // Try to get error message from response
        let errorMessage = `Server returned ${response.status}: ${response.statusText}`;
        try {
          const errorData = await response.json();
          if (errorData.error) {
            errorMessage = errorData.error;
          }
        } catch {
          // If response isn't JSON, use status text
        }
        throw new Error(errorMessage);
      }
      
      const data = await response.json();
      
      if (!data.token) {
        throw new Error("No token received from server. Check server logs for details.");
      }
      
      return data.token;
    } catch (error: any) {
      console.error("Error fetching token:", error);
      
      // Provide more helpful error messages
      if (error.message.includes("Failed to fetch") || error.message.includes("NetworkError")) {
        throw new Error("Cannot connect to server. Make sure the server is running on http://localhost:3001");
      }
      
      throw new Error(`Failed to fetch token: ${error.message}`);
    }
  };

  const startCapture = async (tabId: number) => {
    setLoading(true);
    setStatus("Starting capture...");

    try {
      // Check microphone permission first
      if (microphonePermission !== 'granted') {
        setStatus('Please grant microphone permission before starting capture.');
        setLoading(false);
        return;
      }

      // Start tab capture
      const response = await chrome.runtime.sendMessage({
        action: "startCapture",
        tabId,
      });

      if (response && response.success && response.streamId) {
        setIsCapturing(true);
        setStatus("Capturing audio from selected tab");

        try {
          // Get the audio stream from tab capture
          const stream = await getAudioStream(response.streamId);
          streamRef.current = stream;
          globalCaptureManager.setStream(stream);

          // Store scribe globally for persistence
          // Make sure global callbacks are set before storing scribe
          console.log("🔧 [Scribe] Setting up global callbacks...");
          globalCaptureManager.setTranscriptCallbacks(
            setPartialTranscript,
            (transcript: any) => {
              addCommittedTranscript({
                id: transcript.id || Date.now().toString(),
                text: transcript.text,
                timestamp: transcript.timestamp || Date.now(),
              });
            }
          );
          console.log("💾 [Scribe] Storing Scribe instance globally...");
          globalCaptureManager.setScribe(scribe);
          console.log("✅ [Scribe] Scribe stored globally:", {
            isConnected: scribe.isConnected,
            hasGlobalCallbacks: !!globalCaptureManager.getSetPartialTranscript(),
          });

          // Start monitoring audio levels
          const audioLevelInterval = window.setInterval(() => {
            const level = getAudioLevel();
            setAudioLevel(level);
          }, 100);
          audioLevelIntervalRef.current = audioLevelInterval;
          globalCaptureManager.setAudioLevelInterval(audioLevelInterval);

          // Fetch token and connect to ElevenLabs
          setStatus("Connecting to transcription service...");
          console.log("🔑 [Scribe] Fetching authentication token...");
          const token = await fetchToken();
          console.log("✅ [Scribe] Token received, length:", token?.length || 0);

          console.log("🔌 [Scribe] Connecting to ElevenLabs Scribe service...");
          console.log("📊 [Scribe] Connection state before connect:", {
            isConnected: scribe.isConnected,
          });
          
          try {
            await scribe.connect({
              token,
              // Don't pass microphone option - we're sending audio manually
            });
            
            console.log("✅ [Scribe] Successfully connected to ElevenLabs!", {
              isConnected: scribe.isConnected,
              timestamp: new Date().toISOString(),
            });
            setStatus("Transcribing...");
          } catch (connectError: any) {
            console.error("❌ [Scribe] Connection failed:", {
              error: connectError,
              message: connectError?.message,
              stack: connectError?.stack,
            });
            throw connectError;
          }

          // Process the captured stream and send audio chunks to ElevenLabs
          const audioContext = new AudioContext({ sampleRate: 16000 });
          audioContextRef.current = audioContext;
          globalCaptureManager.setAudioContext(audioContext);

          const source = audioContext.createMediaStreamSource(stream);
          const processor = audioContext.createScriptProcessor(4096, 1, 1);
          processorRef.current = processor;
          globalCaptureManager.setProcessor(processor);

          console.log("🎵 [Scribe] Setting up audio processing pipeline...", {
            bufferSize: 4096,
            sampleRate: 16000,
            channels: 1,
          });

          let audioChunkCount = 0;
          let lastLogTime = Date.now();

          processor.onaudioprocess = (event) => {
            // Use global scribe instance to ensure it works even after component unmounts
            const scribeInstance = globalCaptureManager.getScribe();
            if (!scribeInstance) {
              console.warn("⚠️ [Scribe] No scribe instance available for audio processing");
              return;
            }
            
            if (!scribeInstance.isConnected) {
              // Only log this occasionally to avoid spam
              if (Date.now() - lastLogTime > 5000) {
                console.warn("⚠️ [Scribe] Scribe not connected, skipping audio chunk");
                lastLogTime = Date.now();
              }
              return;
            }

            const inputData = event.inputBuffer.getChannelData(0);

            // Convert Float32Array to Int16Array (PCM format)
            const pcmData = new Int16Array(inputData.length);
            for (let i = 0; i < inputData.length; i++) {
              const s = Math.max(-1, Math.min(1, inputData[i]));
              pcmData[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
            }

            // Convert to base64 and send to ElevenLabs
            const bytes = new Uint8Array(pcmData.buffer);
            let binary = '';
            for (let i = 0; i < bytes.byteLength; i++) {
              binary += String.fromCharCode(bytes[i]);
            }
            const base64Audio = btoa(binary);

            audioChunkCount++;
            
            // Log periodically (every 100 chunks = ~every ~10 seconds at 4096 buffer size)
            if (audioChunkCount % 100 === 0) {
              console.log("📤 [Scribe] Sending audio chunk to ElevenLabs:", {
                chunkNumber: audioChunkCount,
                audioLength: base64Audio.length,
                pcmLength: pcmData.length,
                isConnected: scribeInstance.isConnected,
                timestamp: new Date().toISOString(),
              });
            }

            // Send audio chunk to ElevenLabs
            try {
              scribeInstance.sendAudio(base64Audio, {
                sampleRate: 16000,
              });
            } catch (sendError: any) {
              console.error("❌ [Scribe] Error sending audio chunk:", {
                error: sendError,
                message: sendError?.message,
                chunkNumber: audioChunkCount,
              });
            }
          };

          source.connect(processor);
          processor.connect(audioContext.destination);

          // Commit transcription every 25 seconds (recommended: 20-30 seconds)
          console.log("⏱️ [Scribe] Starting commit interval (every 25 seconds)...");
          let commitCount = 0;
          const commitInterval = window.setInterval(() => {
            const scribeInstance = globalCaptureManager.getScribe();
            if (scribeInstance && scribeInstance.isConnected) {
              commitCount++;
              console.log("💾 [Scribe] Committing transcript segment:", {
                commitNumber: commitCount,
                timestamp: new Date().toISOString(),
                isConnected: scribeInstance.isConnected,
              });
              try {
                scribeInstance.commit();
                console.log("✅ [Scribe] Commit successful");
              } catch (commitError: any) {
                console.error("❌ [Scribe] Commit failed:", {
                  error: commitError,
                  message: commitError?.message,
                  commitNumber: commitCount,
                });
              }
            } else {
              console.warn("⚠️ [Scribe] Cannot commit - scribe not connected:", {
                hasInstance: !!scribeInstance,
                isConnected: scribeInstance?.isConnected || false,
                commitNumber: commitCount,
              });
            }
          }, 25000);
          commitIntervalRef.current = commitInterval;
          globalCaptureManager.setCommitInterval(commitInterval);

        } catch (streamError: any) {
          console.error('Stream access or transcription failed:', streamError);
          setStatus(`Error: ${streamError.message || "Failed to start transcription"}`);
          setIsCapturing(false);
        }
      } else {
        setStatus(`Error: ${response?.error || "Failed to start capture"}`);
      }
    } catch (error: any) {
      setStatus(`Error: ${error.message || "Failed to start capture"}`);
      setIsCapturing(false);
    } finally {
      setLoading(false);
    }
  };

  const stopCapture = async () => {
    setLoading(true);
    setStatus("Stopping capture...");

    try {
      console.log("🛑 [Scribe] Stopping capture...");
      
      // Get scribe instance before stopping
      const scribeInstance = globalCaptureManager.getScribe();
      console.log("📊 [Scribe] Scribe state before stop:", {
        hasInstance: !!scribeInstance,
        isConnected: scribeInstance?.isConnected || false,
        timestamp: new Date().toISOString(),
      });

      // Disconnect from ElevenLabs
      if (scribeInstance && scribeInstance.isConnected) {
        console.log("🔌 [Scribe] Disconnecting from ElevenLabs...");
        try {
          scribeInstance.disconnect();
          console.log("✅ [Scribe] Successfully disconnected from ElevenLabs");
        } catch (disconnectError: any) {
          console.error("❌ [Scribe] Error during disconnect:", {
            error: disconnectError,
            message: disconnectError?.message,
          });
        }
      } else {
        console.log("ℹ️ [Scribe] Already disconnected, skipping disconnect");
      }

      // Stop global capture (this stops everything)
      console.log("🛑 [Scribe] Stopping global capture manager...");
      globalCaptureManager.stop();

      // Stop audio capture
      stopAudioCapture();

      // Clear local refs
      processorRef.current = null;
      audioContextRef.current = null;
      streamRef.current = null;
      audioLevelIntervalRef.current = null;
      commitIntervalRef.current = null;

      setAudioLevel(0);
      
      console.log("✅ [Scribe] Capture stopped successfully");

      // Notify background script
      const response = await chrome.runtime.sendMessage({
        action: "stopCapture",
      });

      if (response && response.success) {
        setIsCapturing(false);
        setStatus("Capture stopped");
      } else {
        setIsCapturing(false);
        setStatus("Capture stopped");
      }
    } catch (error: any) {
      setStatus(`Error: ${error.message || "Failed to stop capture"}`);
      setIsCapturing(false);
    } finally {
      setLoading(false);
    }
  };

  return {
    isCapturing,
    status,
    loading,
    audioLevel,
    microphonePermission,
    startCapture,
    stopCapture,
    requestMicrophonePermission: requestMicrophonePermissionHandler,
    checkMicrophonePermission: checkMicrophonePermissionStatus,
    setStatus,
    isTranscribing: scribe.isTranscribing || scribe.status === "transcribing",
    scribeStatus: scribe.status,
    scribeError: scribe.error,
  };
}
