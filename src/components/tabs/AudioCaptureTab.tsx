import { useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useTabs } from "@/hooks/useTabs";
import { useAudioCapture } from "@/hooks/useAudioCapture";

export function AudioCaptureTab() {
  const { tabs, selectedTabId, setSelectedTabId, error, loadTabs, getTabName } =
    useTabs();
  const {
    isCapturing,
    status,
    loading,
    audioLevel,
    audioStreamRef,
    startCapture,
    stopCapture,
  } = useAudioCapture();

  useEffect(() => {
    loadTabs();
  }, []);

  const handleStartCapture = () => {
    if (!selectedTabId) {
      return;
    }
    startCapture(selectedTabId);
  };

  return (
    <div className="h-full w-full flex items-center justify-center p-4">
      <div className="w-full max-w-md p-6 bg-white rounded-lg shadow-md space-y-6">
        <h1 className="text-2xl font-bold text-center mb-4">Audio Capture</h1>

        <div className="space-y-4">
          <div>
            <Label className="mb-2">Select Video Call Tab:</Label>
            {tabs.length === 0 ? (
              <div className="text-sm text-gray-500 mb-2">
                No video call tabs found. Open Google Meet, Teams, or Zoom.
              </div>
            ) : (
              <select
                value={selectedTabId || ""}
                onChange={(e) => setSelectedTabId(Number(e.target.value))}
                disabled={isCapturing}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 text-sm"
              >
                {tabs.map((tab) => (
                  <option key={tab.id} value={tab.id}>
                    {getTabName(tab)}
                  </option>
                ))}
              </select>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={loadTabs}
              className="mt-2 w-full"
            >
              Refresh Tabs
            </Button>
          </div>

          <div className="space-y-2">
            {!isCapturing ? (
              <Button
                onClick={handleStartCapture}
                disabled={loading || !selectedTabId || tabs.length === 0}
                className="w-full"
              >
                {loading ? "Starting..." : "Start Capture"}
              </Button>
            ) : (
              <Button
                onClick={stopCapture}
                disabled={loading}
                variant="destructive"
                className="w-full"
              >
                {loading ? "Stopping..." : "Stop Capture"}
              </Button>
            )}
          </div>

          {(status || error) && (
            <div
              className={`p-3 rounded text-sm ${
                isCapturing
                  ? "bg-green-50 text-green-800 border border-green-200"
                  : status.includes("Error") || error
                  ? "bg-red-50 text-red-800 border border-red-200"
                  : "bg-blue-50 text-blue-800 border border-blue-200"
              }`}
            >
              {error || status}
            </div>
          )}

          {isCapturing && (
            <div className="space-y-2">
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
        </div>
      </div>
    </div>
  );
}
