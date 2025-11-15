import { useState, useEffect, useRef } from "react";
import { useScribe, AudioFormat } from "@elevenlabs/react";
import { getAudioStream, stopAudioCapture, getAudioLevel } from "@/utils/audioCapture";
import { useTranscripts } from "@/contexts/TranscriptContext";

export function useAudioCapture() {
  const [isCapturing, setIsCapturing] = useState(false);
  const [status, setStatus] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const audioLevelIntervalRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const commitIntervalRef = useRef<number | null>(null);
  const { setPartialTranscript, addCommittedTranscript } = useTranscripts();

  // Initialize ElevenLabs Scribe
  const scribe = useScribe({
    modelId: "scribe_v2_realtime",
    audioFormat: AudioFormat.PCM_16000,
    sampleRate: 16000,
    onPartialTranscript: (data) => {
      console.log("Partial transcript:", data.text);
      setPartialTranscript(data.text);
    },
    onCommittedTranscript: (data) => {
      console.log("Committed transcript:", data.text);
      addCommittedTranscript({
        id: (data as any).id || Date.now().toString(),
        text: data.text,
        timestamp: Date.now(),
      });
      // Clear partial when we get a committed transcript
      setPartialTranscript("");
    },
  });

  useEffect(() => {
    checkCaptureStatus();
  }, []);

  useEffect(() => {
    return () => {
      // Cleanup on unmount
      if (audioLevelIntervalRef.current) {
        clearInterval(audioLevelIntervalRef.current);
        audioLevelIntervalRef.current = null;
      }
      if (commitIntervalRef.current) {
        clearInterval(commitIntervalRef.current);
        commitIntervalRef.current = null;
      }
      if (processorRef.current) {
        processorRef.current.disconnect();
        processorRef.current = null;
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    };
  }, []);

  const checkCaptureStatus = async () => {
    try {
      const response = await chrome.runtime.sendMessage({
        action: "getCaptureStatus",
      });
      if (response) {
        setIsCapturing(response.isCapturing);
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

          // Start monitoring audio levels
          audioLevelIntervalRef.current = window.setInterval(() => {
            const level = getAudioLevel();
            setAudioLevel(level);
          }, 100);

          // Fetch token and connect to ElevenLabs
          setStatus("Connecting to transcription service...");
          const token = await fetchToken();

          await scribe.connect({
            token,
            // Don't pass microphone option - we're sending audio manually
          });

          setStatus("Transcribing...");

          // Process the captured stream and send audio chunks to ElevenLabs
          const audioContext = new AudioContext({ sampleRate: 16000 });
          audioContextRef.current = audioContext;

          const source = audioContext.createMediaStreamSource(stream);
          const processor = audioContext.createScriptProcessor(4096, 1, 1);
          processorRef.current = processor;

          processor.onaudioprocess = (event) => {
            if (!scribe.isConnected) {
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

            // Send audio chunk to ElevenLabs
            scribe.sendAudio(base64Audio, {
              sampleRate: 16000,
            });
          };

          source.connect(processor);
          processor.connect(audioContext.destination);

          // Commit transcription every 25 seconds (recommended: 20-30 seconds)
          commitIntervalRef.current = window.setInterval(() => {
            if (scribe.isConnected) {
              scribe.commit();
              console.log("Committed transcript segment");
            }
          }, 25000);

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
      // Disconnect from ElevenLabs
      if (scribe.isConnected) {
        scribe.disconnect();
      }

      // Stop audio capture
      stopAudioCapture();

      // Stop audio processing
      if (processorRef.current) {
        processorRef.current.disconnect();
        processorRef.current = null;
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }

      // Stop the captured stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }

      // Stop monitoring audio levels
      if (audioLevelIntervalRef.current) {
        clearInterval(audioLevelIntervalRef.current);
        audioLevelIntervalRef.current = null;
      }

      // Stop commit interval
      if (commitIntervalRef.current) {
        clearInterval(commitIntervalRef.current);
        commitIntervalRef.current = null;
      }

      setAudioLevel(0);

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
    startCapture,
    stopCapture,
    setStatus,
    isTranscribing: scribe.isConnected,
  };
}
