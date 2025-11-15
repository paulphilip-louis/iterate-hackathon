import { useState, useEffect, useRef } from "react";
import { getAudioStream, stopAudioCapture, getAudioLevel } from "@/utils/audioCapture";
import { AudioStream } from "@/utils/audioStream";

export function useAudioCapture() {
  const [isCapturing, setIsCapturing] = useState(false);
  const [status, setStatus] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const audioLevelIntervalRef = useRef<number | null>(null);
  const audioStreamRef = useRef<AudioStream | null>(null);

  useEffect(() => {
    checkCaptureStatus();
  }, []);

  useEffect(() => {
    return () => {
      if (audioLevelIntervalRef.current) {
        clearInterval(audioLevelIntervalRef.current);
      }
      if (audioStreamRef.current) {
        audioStreamRef.current.disconnect();
      }
      if (isCapturing) {
        stopAudioCapture();
      }
    };
  }, [isCapturing]);

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

  const startAudioStreaming = async (stream: MediaStream) => {
    try {
      setStatus("Connecting to server...");

      const audioStream = new AudioStream((status) => {
        setStatus(status);
      });

      audioStreamRef.current = audioStream;
      await audioStream.connect(stream);
      setStatus("Streaming audio to server...");
    } catch (error: any) {
      console.error('Error starting audio streaming:', error);
      setStatus(`Streaming error: ${error.message}`);
    }
  };

  const startCapture = async (tabId: number) => {
    setLoading(true);
    setStatus("Starting capture...");

    try {
      const response = await chrome.runtime.sendMessage({
        action: "startCapture",
        tabId,
      });

      if (response && response.success && response.streamId) {
        setIsCapturing(true);
        setStatus("Capturing audio from selected tab");
        
        try {
          const stream = await getAudioStream(response.streamId);
          
          audioLevelIntervalRef.current = window.setInterval(() => {
            const level = getAudioLevel();
            setAudioLevel(level);
          }, 100);

          await startAudioStreaming(stream);
        } catch (streamError: any) {
          console.warn('Stream access failed:', streamError);
          setStatus("Capture started but stream access failed. Check console for details.");
        }
      } else {
        setStatus(`Error: ${response?.error || "Failed to start capture"}`);
      }
    } catch (error: any) {
      setStatus(`Error: ${error.message || "Failed to start capture"}`);
    } finally {
      setLoading(false);
    }
  };

  const stopCapture = async () => {
    setLoading(true);
    setStatus("Stopping capture...");

    try {
      if (audioStreamRef.current) {
        audioStreamRef.current.disconnect();
        audioStreamRef.current = null;
      }
      
      stopAudioCapture();
      
      if (audioLevelIntervalRef.current) {
        clearInterval(audioLevelIntervalRef.current);
        audioLevelIntervalRef.current = null;
      }
      setAudioLevel(0);

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
    audioStreamRef,
    startCapture,
    stopCapture,
    setStatus,
  };
}

