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

  const connectWebSocket = (): Promise<string> => {
    return new Promise((resolve, reject) => {
      try {
        const ws = new WebSocket(WS_URL);

        ws.onopen = () => {
          console.log("🔌 WebSocket connected");
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
              const audioSource = data.audioSource;
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

    if (!text || text.trim().length === 0) {
      console.log(`⏭️ Skipping empty transcription from ${audioSource || 'unknown'}`);
      const setPartial = globalCaptureManager.getSetPartialTranscript();
      if (setPartial) {
        setPartial("");
      } else {
        setPartialTranscript("");
      }
      return;
    }

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

  const uploadAudioChunk = async (audioData: Float32Array, audioSource: 'tab' | 'microphone') => {
    try {
      if (!sessionIdRef.current) {
        console.warn("⚠️ No session ID available, skipping upload");
        return;
      }

      const pcmData = new Int16Array(audioData.length);
      for (let i = 0; i < audioData.length; i++) {
        const s = Math.max(-1, Math.min(1, audioData[i]));
        pcmData[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
      }

      const bytes = new Uint8Array(pcmData.buffer);
      let binary = '';
      for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const base64Audio = btoa(binary);

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

          streamRef.current = globalStream;
          processorRef.current = globalProcessor;
          audioContextRef.current = globalAudioContext;

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
      if (microphonePermission !== 'granted') {
        setStatus('Please grant microphone permission before starting capture.');
        setLoading(false);
        return;
      }

      if (!tabId) {
        setStatus('Please select a tab to capture.');
        setLoading(false);
        return;
      }

      setStatus("Connecting to transcription service...");
      await connectWebSocket();
      console.log("✅ WebSocket connected, session ID:", sessionIdRef.current);

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

        const mixedStream = mixAudioStreams(tabStream, micStream);
        streamRef.current = mixedStream;
        globalCaptureManager.setStream(mixedStream);

        const audioLevelInterval = window.setInterval(() => {
          const level = getAudioLevel();
          setAudioLevel(level);
        }, 100);
        audioLevelIntervalRef.current = audioLevelInterval;
        globalCaptureManager.setAudioLevelInterval(audioLevelInterval);

        const audioContext = new AudioContext({ sampleRate: 16000 });
        audioContextRef.current = audioContext;
        globalCaptureManager.setAudioContext(audioContext);

        if (audioContext.state === 'suspended') {
          await audioContext.resume();
          console.log("🔊 AudioContext resumed from suspended state");
        }
        console.log("🎵 AudioContext state:", audioContext.state);

        console.log("🎵 Setting up audio processing pipelines for tab and microphone...");

        const tabSource = audioContext.createMediaStreamSource(tabStream);
        
        const tabSplitter = audioContext.createGain();
        tabSplitter.gain.value = 1.0;
        
        tabSplitter.connect(audioContext.destination);
        
        const tabProcessor = audioContext.createScriptProcessor(4096, 1, 1);
        let tabChunkCount = 0;
        const tabChunks: Float32Array[] = [];

        tabProcessor.onaudioprocess = (event) => {
          const inputData = event.inputBuffer.getChannelData(0);
          tabChunks.push(new Float32Array(inputData));
          tabChunkCount++;

          if (tabChunkCount % 20 === 0) {
            const accumulated = new Float32Array(tabChunks.reduce((acc, chunk) => acc + chunk.length, 0));
            let offset = 0;
            for (const chunk of tabChunks) {
              accumulated.set(chunk, offset);
              offset += chunk.length;
            }
            uploadAudioChunk(accumulated, 'tab');
            tabChunks.length = 0;
          }
        };

        tabSource.connect(tabSplitter);
        tabSplitter.connect(tabProcessor);
        const tabProcessorGain = audioContext.createGain();
        tabProcessorGain.gain.value = 0;
        tabProcessor.connect(tabProcessorGain);
        tabProcessorGain.connect(audioContext.destination);

        const micSource = audioContext.createMediaStreamSource(micStream);
        const micProcessor = audioContext.createScriptProcessor(4096, 1, 1);
        const micGainNode = audioContext.createGain();
        micGainNode.gain.value = 0;
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
        micProcessor.connect(micGainNode);
        micGainNode.connect(audioContext.destination);

        processorRef.current = tabProcessor;
        globalCaptureManager.setProcessor(tabProcessor);

        setStatus("Transcribing...");

      } catch (streamError: any) {
        console.error('Stream access or transcription failed:', streamError);
        setStatus(`Error: ${streamError.message || "Failed to start transcription"}`);
        setIsCapturing(false);

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

      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      sessionIdRef.current = null;

      globalCaptureManager.stop();

      stopAudioCapture();

      if (microphoneStreamRef.current) {
        microphoneStreamRef.current.getTracks().forEach(track => track.stop());
        microphoneStreamRef.current = null;
      }

      if (tabStreamRef.current) {
        tabStreamRef.current.getTracks().forEach(track => track.stop());
        tabStreamRef.current = null;
      }

      processorRef.current = null;
      audioContextRef.current = null;
      streamRef.current = null;
      audioLevelIntervalRef.current = null;
      uploadIntervalRef.current = null;

      setAudioLevel(0);

      console.log("✅ Capture stopped successfully");

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
