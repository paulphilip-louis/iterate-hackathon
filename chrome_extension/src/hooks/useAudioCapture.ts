import { useState, useEffect, useRef } from "react";
import { getAudioStream, stopAudioCapture, getAudioLevel, requestMicrophonePermission, checkMicrophonePermission } from "@/utils/audioCapture";
import { useTranscripts } from "@/contexts/TranscriptContext";
import { globalCaptureManager } from "@/utils/globalCaptureManager";

const SERVER_URL = "http://localhost:3001";
const WS_URL = "ws://localhost:3001";

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
  const wsRef = useRef<WebSocket | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const audioChunksRef = useRef<Float32Array[]>([]);
  const uploadIntervalRef = useRef<number | null>(null);
  const { setPartialTranscript, addCommittedTranscript } = useTranscripts();

  // Update global callbacks whenever they change
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

  // Connect to WebSocket server for receiving transcription results
  const connectWebSocket = (): Promise<string> => {
    return new Promise((resolve, reject) => {
      try {
        const ws = new WebSocket(WS_URL);
        
        ws.onopen = () => {
          console.log("🔌 WebSocket connected");
          // Register session
          ws.send(JSON.stringify({ type: 'register_session' }));
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            
            if (data.type === 'session_registered') {
              console.log("✅ Session registered:", data.sessionId);
              sessionIdRef.current = data.sessionId;
              resolve(data.sessionId);
            } else if (data.type === 'transcription_completed') {
              console.log("✅ Transcription completed:", data.transcription);
              handleTranscriptionResult(data.transcription);
            }
          } catch (error) {
            console.error("❌ Error parsing WebSocket message:", error);
          }
        };

        ws.onerror = (error) => {
          console.error("❌ WebSocket error:", error);
          reject(new Error("Failed to connect to WebSocket server"));
        };

        ws.onclose = () => {
          console.log("🔌 WebSocket disconnected");
          wsRef.current = null;
        };

        wsRef.current = ws;
      } catch (error: any) {
        reject(new Error(`WebSocket connection failed: ${error.message}`));
      }
    });
  };

  const handleTranscriptionResult = (transcription: any) => {
    const { text } = transcription;
    
    console.log("✅ Received transcription:", {
      text,
      language: transcription.language_code,
      wordCount: transcription.words?.length || 0,
    });
    
    // Add as committed transcript
    const setCommitted = globalCaptureManager.getAddCommittedTranscript();
    if (setCommitted) {
      setCommitted({
        id: Date.now().toString(),
        text: text,
        timestamp: Date.now(),
      });
    } else {
      addCommittedTranscript({
        id: Date.now().toString(),
        text: text,
        timestamp: Date.now(),
      });
    }
    
    // Clear partial transcript
    const setPartial = globalCaptureManager.getSetPartialTranscript();
    if (setPartial) {
      setPartial("");
    } else {
      setPartialTranscript("");
    }
  };

  // Upload audio chunk to server
  const uploadAudioChunk = async (audioData: Float32Array) => {
    try {
      if (!sessionIdRef.current) {
        console.warn("⚠️ No session ID available, skipping upload");
        return;
      }

      // Convert Float32Array to Int16Array (PCM format)
      const pcmData = new Int16Array(audioData.length);
      for (let i = 0; i < audioData.length; i++) {
        const s = Math.max(-1, Math.min(1, audioData[i]));
        pcmData[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
      }

      // Convert to base64
      const bytes = new Uint8Array(pcmData.buffer);
      let binary = '';
      for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const base64Audio = btoa(binary);

      // Send to server
      const response = await fetch(`${SERVER_URL}/speech-to-text/upload`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          audioData: base64Audio,
          sessionId: sessionIdRef.current,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Server returned ${response.status}`);
      }

      const result = await response.json();
      console.log("📤 Audio chunk uploaded:", result.requestId);
    } catch (error: any) {
      console.error("❌ Error uploading audio chunk:", error);
    }
  };

  useEffect(() => {
    // Sync with global capture state when component mounts
    const syncWithGlobalCapture = async () => {
      const response = await chrome.runtime.sendMessage({
        action: "getCaptureStatus",
      });
      
      if (response && response.isCapturing && globalCaptureManager.isRunning()) {
        const globalStream = globalCaptureManager.getStream();
        const globalProcessor = globalCaptureManager.getProcessor();
        const globalAudioContext = globalCaptureManager.getAudioContext();
        
        if (globalStream && globalProcessor && globalAudioContext) {
          console.log("🔄 Component mounting, detected global capture...");
          
          // Reconnect to global resources
          streamRef.current = globalStream;
          processorRef.current = globalProcessor;
          audioContextRef.current = globalAudioContext;
          
          // Start audio level monitoring
          if (!audioLevelIntervalRef.current) {
            audioLevelIntervalRef.current = window.setInterval(() => {
              const level = getAudioLevel();
              setAudioLevel(level);
            }, 100);
          }
          
          setIsCapturing(true);
          setStatus("Capture is running globally");
        }
      }
    };
    
    syncWithGlobalCapture();

    return () => {
      // Cleanup local intervals only
      if (audioLevelIntervalRef.current) {
        clearInterval(audioLevelIntervalRef.current);
        audioLevelIntervalRef.current = null;
      }
    };
  }, []);

  const checkCaptureStatus = async () => {
    try {
      const response = await chrome.runtime.sendMessage({
        action: "getCaptureStatus",
      });
      if (response && response.isCapturing && globalCaptureManager.isRunning()) {
        console.log("🔄 Detected global capture running, reconnecting...");
        setIsCapturing(true);
        setStatus("Capture is running globally");
        
        const globalStream = globalCaptureManager.getStream();
        const globalProcessor = globalCaptureManager.getProcessor();
        const globalAudioContext = globalCaptureManager.getAudioContext();
        
        if (globalStream && globalProcessor && globalAudioContext) {
          streamRef.current = globalStream;
          processorRef.current = globalProcessor;
          audioContextRef.current = globalAudioContext;
        }
        
        // Start monitoring audio levels
        if (!audioLevelIntervalRef.current) {
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

      // Connect to WebSocket first
      setStatus("Connecting to transcription service...");
      await connectWebSocket();
      console.log("✅ WebSocket connected, session ID:", sessionIdRef.current);

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

          // Update global callbacks
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

          // Start monitoring audio levels
          const audioLevelInterval = window.setInterval(() => {
            const level = getAudioLevel();
            setAudioLevel(level);
          }, 100);
          audioLevelIntervalRef.current = audioLevelInterval;
          globalCaptureManager.setAudioLevelInterval(audioLevelInterval);

          // Process the captured stream and collect audio chunks
          const audioContext = new AudioContext({ sampleRate: 16000 });
          audioContextRef.current = audioContext;
          globalCaptureManager.setAudioContext(audioContext);

          const source = audioContext.createMediaStreamSource(stream);
          const processor = audioContext.createScriptProcessor(4096, 1, 1);
          processorRef.current = processor;
          globalCaptureManager.setProcessor(processor);

          console.log("🎵 Setting up audio processing pipeline...");

          let audioChunkCount = 0;
          audioChunksRef.current = [];

          processor.onaudioprocess = (event) => {
            const inputData = event.inputBuffer.getChannelData(0);
            
            // Collect audio chunks
            audioChunksRef.current.push(new Float32Array(inputData));
            audioChunkCount++;

            // Periodically upload accumulated chunks (every 5 seconds worth of audio)
            // At 16000 sample rate, 4096 samples = ~0.25 seconds
            // So every 20 chunks = ~5 seconds
            if (audioChunkCount % 20 === 0) {
              const accumulated = new Float32Array(audioChunksRef.current.reduce((acc, chunk) => acc + chunk.length, 0));
              let offset = 0;
              for (const chunk of audioChunksRef.current) {
                accumulated.set(chunk, offset);
                offset += chunk.length;
              }
              
              uploadAudioChunk(accumulated);
              audioChunksRef.current = []; // Clear accumulated chunks
            }
          };

          source.connect(processor);
          processor.connect(audioContext.destination);

          setStatus("Transcribing...");

        } catch (streamError: any) {
          console.error('Stream access or transcription failed:', streamError);
          setStatus(`Error: ${streamError.message || "Failed to start transcription"}`);
          setIsCapturing(false);
        }
      } else {
        setStatus(`Error: ${response?.error || "Failed to start capture"}`);
      }
    } catch (error: any) {
      console.error("Error starting capture:", error);
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
      console.log("🛑 Stopping capture...");

      // Upload any remaining audio chunks
      if (audioChunksRef.current.length > 0) {
        const accumulated = new Float32Array(audioChunksRef.current.reduce((acc, chunk) => acc + chunk.length, 0));
        let offset = 0;
        for (const chunk of audioChunksRef.current) {
          accumulated.set(chunk, offset);
          offset += chunk.length;
        }
        await uploadAudioChunk(accumulated);
        audioChunksRef.current = [];
      }

      // Close WebSocket connection
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      sessionIdRef.current = null;

      // Stop global capture
      globalCaptureManager.stop();

      // Stop audio capture
      stopAudioCapture();

      // Clear local refs
      processorRef.current = null;
      audioContextRef.current = null;
      streamRef.current = null;
      audioLevelIntervalRef.current = null;
      uploadIntervalRef.current = null;

      setAudioLevel(0);
      
      console.log("✅ Capture stopped successfully");

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
      console.error("Error stopping capture:", error);
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
    isTranscribing: isCapturing,
    scribeStatus: isCapturing ? "transcribing" : "idle",
    scribeError: null,
  };
}
