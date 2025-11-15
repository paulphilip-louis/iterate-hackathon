import { useState, useEffect, useRef } from "react";
import { getAudioStream, stopAudioCapture, getAudioLevel, requestMicrophonePermission, checkMicrophonePermission, getMicrophoneStream, mixAudioStreams } from "@/utils/audioCapture";
import { useTranscripts } from "@/contexts/TranscriptContext";
import { globalCaptureManager } from "@/utils/globalCaptureManager";

export type AudioSource = 'tab' | 'microphone' | 'both';

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
  const microphoneStreamRef = useRef<MediaStream | null>(null);
  const tabStreamRef = useRef<MediaStream | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const sessionIdRef = useRef<string | null>(null);
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
          source: transcript.source, // Preserve source if available
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
              const audioSource = data.audioSource; // 'tab' or 'microphone'
              handleTranscriptionResult(data.transcription, audioSource);
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

  const handleTranscriptionResult = (transcription: any, audioSource?: 'tab' | 'microphone') => {
    const { text } = transcription;

    // Skip empty transcripts
    if (!text || text.trim().length === 0) {
      console.log(`⏭️ Skipping empty transcription from ${audioSource || 'unknown'}`);
      // Clear partial transcript if it exists
      const setPartial = globalCaptureManager.getSetPartialTranscript();
      if (setPartial) {
        setPartial("");
      } else {
        setPartialTranscript("");
      }
      return;
    }

    // Log based on source
    if (audioSource) {
      console.log(`✅ Received transcription from ${audioSource}:`, {
        text,
        language: transcription.language_code,
        wordCount: transcription.words?.length || 0,
      });
      console.log(`🎉 Finished transcription!!! (${audioSource})`);
    } else {
      console.log("✅ Received transcription:", {
        text,
        language: transcription.language_code,
        wordCount: transcription.words?.length || 0,
      });
      console.log("🎉 Finished transcription!!!");
    }

    // Add as committed transcript with source
    const setCommitted = globalCaptureManager.getAddCommittedTranscript();
    if (setCommitted) {
      setCommitted({
        id: Date.now().toString(),
        text: text,
        timestamp: Date.now(),
        source: audioSource, // Include source (tab or microphone)
      });
    } else {
      addCommittedTranscript({
        id: Date.now().toString(),
        text: text,
        timestamp: Date.now(),
        source: audioSource, // Include source (tab or microphone)
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
  const uploadAudioChunk = async (audioData: Float32Array, audioSource: 'tab' | 'microphone') => {
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

      // Send to server with audio source identifier
      const response = await fetch(`${SERVER_URL}/speech-to-text/upload`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          audioData: base64Audio,
          sessionId: sessionIdRef.current,
          audioSource: audioSource, // 'tab' or 'microphone'
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Server returned ${response.status}`);
      }

      const result = await response.json();
      console.log(`📤 Audio chunk uploaded (${audioSource}):`, result.requestId);
    } catch (error: any) {
      console.error(`❌ Error uploading audio chunk (${audioSource}):`, error);
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
      // Always require microphone permission
      if (microphonePermission !== 'granted') {
        setStatus('Please grant microphone permission before starting capture.');
        setLoading(false);
        return;
      }

      // Always require tabId
      if (!tabId) {
        setStatus('Please select a tab to capture.');
        setLoading(false);
        return;
      }

      // Connect to WebSocket first
      setStatus("Connecting to transcription service...");
      await connectWebSocket();
      console.log("✅ WebSocket connected, session ID:", sessionIdRef.current);

      // Always capture both tab and microphone audio
      setStatus("Starting tab capture...");
      const response = await chrome.runtime.sendMessage({
        action: "startCapture",
        tabId,
      });

      if (!response || !response.success || !response.streamId) {
        throw new Error(response?.error || "Failed to start tab capture");
      }

      const tabStream = await getAudioStream(response.streamId);
      tabStreamRef.current = tabStream;
      console.log("✅ Tab stream obtained");

      setStatus("Starting microphone capture...");
      const micStream = await getMicrophoneStream();
      microphoneStreamRef.current = micStream;
      console.log("✅ Microphone stream obtained");

      setIsCapturing(true);
      setStatus("Capturing audio from tab and microphone");

      try {
        // Update global callbacks
        globalCaptureManager.setTranscriptCallbacks(
          setPartialTranscript,
          (transcript: any) => {
            addCommittedTranscript({
              id: transcript.id || Date.now().toString(),
              text: transcript.text,
              timestamp: transcript.timestamp || Date.now(),
              source: transcript.source, // Preserve source if available
            });
          }
        );

        // Start monitoring audio levels (using mixed stream for visualization)
        const mixedStream = mixAudioStreams(tabStream, micStream);
        streamRef.current = mixedStream;
        globalCaptureManager.setStream(mixedStream);

        const audioLevelInterval = window.setInterval(() => {
          const level = getAudioLevel();
          setAudioLevel(level);
        }, 100);
        audioLevelIntervalRef.current = audioLevelInterval;
        globalCaptureManager.setAudioLevelInterval(audioLevelInterval);

        // Process both streams separately
        const audioContext = new AudioContext({ sampleRate: 16000 });
        audioContextRef.current = audioContext;
        globalCaptureManager.setAudioContext(audioContext);

        console.log("🎵 Setting up audio processing pipelines for tab and microphone...");

        // Process tab audio
        const tabSource = audioContext.createMediaStreamSource(tabStream);
        const tabProcessor = audioContext.createScriptProcessor(4096, 1, 1);
        let tabChunkCount = 0;
        const tabChunks: Float32Array[] = [];

        tabProcessor.onaudioprocess = (event) => {
          const inputData = event.inputBuffer.getChannelData(0);
          tabChunks.push(new Float32Array(inputData));
          tabChunkCount++;

          // Upload every 20 chunks (~5 seconds)
          if (tabChunkCount % 20 === 0) {
            const accumulated = new Float32Array(tabChunks.reduce((acc, chunk) => acc + chunk.length, 0));
            let offset = 0;
            for (const chunk of tabChunks) {
              accumulated.set(chunk, offset);
              offset += chunk.length;
            }
            uploadAudioChunk(accumulated, 'tab');
            tabChunks.length = 0; // Clear accumulated chunks
          }
        };

        tabSource.connect(tabProcessor);
        tabProcessor.connect(audioContext.destination);

        // Process microphone audio
        const micSource = audioContext.createMediaStreamSource(micStream);
        const micProcessor = audioContext.createScriptProcessor(4096, 1, 1);
        let micChunkCount = 0;
        const micChunks: Float32Array[] = [];

        micProcessor.onaudioprocess = (event) => {
          const inputData = event.inputBuffer.getChannelData(0);
          micChunks.push(new Float32Array(inputData));
          micChunkCount++;

          // Upload every 20 chunks (~5 seconds)
          if (micChunkCount % 20 === 0) {
            const accumulated = new Float32Array(micChunks.reduce((acc, chunk) => acc + chunk.length, 0));
            let offset = 0;
            for (const chunk of micChunks) {
              accumulated.set(chunk, offset);
              offset += chunk.length;
            }
            uploadAudioChunk(accumulated, 'microphone');
            micChunks.length = 0; // Clear accumulated chunks
          }
        };

        micSource.connect(micProcessor);
        micProcessor.connect(audioContext.destination);

        // Store processors for cleanup
        processorRef.current = tabProcessor; // Store one for compatibility
        globalCaptureManager.setProcessor(tabProcessor);

        setStatus("Transcribing...");

      } catch (streamError: any) {
        console.error('Stream access or transcription failed:', streamError);
        setStatus(`Error: ${streamError.message || "Failed to start transcription"}`);
        setIsCapturing(false);

        // Cleanup streams on error
        if (micStream) {
          micStream.getTracks().forEach(track => track.stop());
        }
        if (tabStream) {
          tabStream.getTracks().forEach(track => track.stop());
        }
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

      // Note: Remaining chunks are handled separately for tab and microphone streams
      // No need to upload mixed chunks here since we process streams separately

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

      // Stop microphone stream if active
      if (microphoneStreamRef.current) {
        microphoneStreamRef.current.getTracks().forEach(track => track.stop());
        microphoneStreamRef.current = null;
      }

      // Stop tab stream if active
      if (tabStreamRef.current) {
        tabStreamRef.current.getTracks().forEach(track => track.stop());
        tabStreamRef.current = null;
      }

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
