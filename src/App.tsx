import { useState, useEffect, useRef } from "react";
import { getAudioStream, stopAudioCapture, getAudioLevel } from "./utils/audioCapture";
import { AudioStream } from "./utils/audioStream";

interface Tab {
  id?: number;
  title?: string;
  url?: string;
}

function App() {
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [selectedTabId, setSelectedTabId] = useState<number | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [status, setStatus] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const audioLevelIntervalRef = useRef<number | null>(null);
  const audioStreamRef = useRef<AudioStream | null>(null);

  useEffect(() => {
    loadTabs();
    checkCaptureStatus();
  }, []);

  const loadTabs = async () => {
    try {
      // Check if chrome.runtime is available
      if (!chrome.runtime || !chrome.runtime.sendMessage) {
        setStatus("Error: Chrome extension API not available");
        return;
      }

      const response = await chrome.runtime.sendMessage({ action: "getTabs" });
      
      // Check for runtime errors after sending message
      if (chrome.runtime.lastError) {
        const errorMsg = chrome.runtime.lastError.message || 'Unknown error';
        setStatus(`Error: ${errorMsg}. Please reload the extension.`);
        return;
      }
      
      if (!response) {
        setStatus("Error: No response from background script. Please reload the extension.");
        return;
      }

      if (response.error) {
        setStatus(`Error: ${response.error}`);
        setTabs([]);
        return;
      }

      if (response && response.tabs !== undefined) {
        setTabs(response.tabs);
        if (response.tabs.length > 0 && !selectedTabId) {
          setSelectedTabId(response.tabs[0].id || null);
        }
        // Clear error status if we successfully loaded tabs (even if empty)
        if (status && status.includes("Error")) {
          setStatus("");
        }
      } else {
        setTabs([]);
        if (!response) {
          setStatus("Error: No response from background script");
        }
      }
    } catch (error: any) {
      console.error("Error loading tabs:", error);
      setStatus(`Error loading tabs: ${error.message || 'Unknown error'}`);
      setTabs([]);
    }
  };

  const checkCaptureStatus = async () => {
    try {
      const response = await chrome.runtime.sendMessage({
        action: "getCaptureStatus",
      });
      if (response) {
        setIsCapturing(response.isCapturing);
        if (response.isCapturing && response.tabId) {
          setSelectedTabId(response.tabId);
        }
      }
    } catch (error) {
      console.error("Error checking capture status:", error);
    }
  };

  const handleStartCapture = async () => {
    if (!selectedTabId) {
      setStatus("Please select a tab");
      return;
    }

    setLoading(true);
    setStatus("Starting capture...");

    try {
      // Request capture from background script
      const response = await chrome.runtime.sendMessage({
        action: "startCapture",
        tabId: selectedTabId,
      });

      if (response && response.success && response.streamId) {
        setIsCapturing(true);
        setStatus("Capturing audio from selected tab");
        
        // Try to get the audio stream for visualization and streaming
        try {
          const stream = await getAudioStream(response.streamId);
          
          // Start monitoring audio levels
          audioLevelIntervalRef.current = window.setInterval(() => {
            const level = getAudioLevel();
            setAudioLevel(level);
          }, 100);

          // Start streaming audio to backend
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

  const handleStopCapture = async () => {
    setLoading(true);
    setStatus("Stopping capture...");

    try {
      // Stop audio streaming
      if (audioStreamRef.current) {
        audioStreamRef.current.disconnect();
        audioStreamRef.current = null;
      }
      
      // Stop audio capture locally
      stopAudioCapture();
      
      // Stop monitoring audio levels
      if (audioLevelIntervalRef.current) {
        clearInterval(audioLevelIntervalRef.current);
        audioLevelIntervalRef.current = null;
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

  // Cleanup on unmount
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
  }, []);

  const getTabName = (tab: Tab) => {
    if (tab.title) {
      return tab.title.length > 40 ? tab.title.substring(0, 40) + "..." : tab.title;
    }
    if (tab.url) {
      try {
        const url = new URL(tab.url);
        return url.hostname;
      } catch {
        return "Unknown";
      }
    }
    return "Unknown Tab";
  };

  return (
    <div className="w-96 p-5 font-sans max-h-[600px] overflow-y-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-4">
        Audio Capture & Streaming
      </h1>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select Video Call Tab:
        </label>
        {tabs.length === 0 ? (
          <div className="text-sm text-gray-500 mb-2">
            No video call tabs found. Open Google Meet, Teams, or Zoom.
          </div>
        ) : (
          <select
            value={selectedTabId || ""}
            onChange={(e) => setSelectedTabId(Number(e.target.value))}
            disabled={isCapturing}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
          >
            {tabs.map((tab) => (
              <option key={tab.id} value={tab.id}>
                {getTabName(tab)}
              </option>
            ))}
          </select>
        )}
        <button
          onClick={loadTabs}
          className="mt-2 text-sm text-blue-600 hover:text-blue-800"
        >
          Refresh Tabs
        </button>
      </div>

      <div className="mb-4">
        {!isCapturing ? (
          <button
            onClick={handleStartCapture}
            disabled={loading || !selectedTabId || tabs.length === 0}
            className="w-full bg-green-500 hover:bg-green-600 active:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-medium py-2 px-5 rounded transition-colors duration-200"
          >
            {loading ? "Starting..." : "Start Capture"}
          </button>
        ) : (
      <button
            onClick={handleStopCapture}
            disabled={loading}
            className="w-full bg-red-500 hover:bg-red-600 active:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-medium py-2 px-5 rounded transition-colors duration-200"
          >
            {loading ? "Stopping..." : "Stop Capture"}
      </button>
        )}
      </div>

      {status && (
        <div
          className={`mt-4 p-3 rounded text-sm ${
            isCapturing
              ? "bg-green-50 text-green-800 border border-green-200"
              : status.includes("Error")
              ? "bg-red-50 text-red-800 border border-red-200"
              : "bg-blue-50 text-blue-800 border border-blue-200"
          }`}
        >
          {status}
        </div>
      )}

      {isCapturing && (
        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-center space-x-2">
            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
            <span className="text-sm font-medium text-gray-700">
              Recording...
            </span>
            {audioStreamRef.current?.connected && (
              <>
                <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium text-blue-700">
                  Streaming...
                </span>
              </>
            )}
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-green-500 h-2 rounded-full transition-all duration-100"
              style={{ width: `${Math.min(audioLevel * 2, 100)}%` }}
            ></div>
          </div>
          <p className="text-xs text-center text-gray-500">
            Audio Level: {Math.round(audioLevel)}
          </p>
        </div>
      )}


      <div className="mt-6 pt-4 border-t border-gray-200 text-xs text-gray-500 space-y-1">
      </div>
    </div>
  );
}

export default App;
