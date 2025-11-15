import { useEffect, useRef } from "react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useTabs } from "@/hooks/useTabs";
import { useAudioCapture } from "@/hooks/useAudioCapture";
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";

interface AudioCaptureScreenProps {
  onNext?: () => void;
}

export function AudioCaptureScreen({ onNext }: AudioCaptureScreenProps) {
  const { tabs, selectedTabId, setSelectedTabId, error, loadTabs, getTabName } =
    useTabs();
  const {
    isCapturing,
    status,
    loading,
    microphonePermission,
    startCapture,
    stopCapture,
    requestMicrophonePermission,
  } = useAudioCapture();
  const hasCalledOnNextRef = useRef(false);

  useEffect(() => {
    loadTabs();
  }, []);

  useEffect(() => {
    if (
      onNext &&
      isCapturing &&
      !loading &&
      status &&
      !status.includes("Error") &&
      !hasCalledOnNextRef.current
    ) {
      if (
        status.includes("Transcribing") ||
        status.includes("Capturing") ||
        status.includes("Connected")
      ) {
        hasCalledOnNextRef.current = true;
        onNext();
      }
    }
  }, [isCapturing, loading, status, onNext]);

  useEffect(() => {
    if (!isCapturing) {
      hasCalledOnNextRef.current = false;
    }
  }, [isCapturing]);

  const handleStartCapture = () => {
    if (!selectedTabId) {
      return;
    }
    startCapture(selectedTabId);
  };

  return (
<div className="min-h-0 h-full w-full flex items-center justify-center bg-gradient-to-br from-neutral-50 to-neutral-200 p-6">
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5 }}
    className="w-full max-w-md"
  >
    <Card className="min-h-0 rounded-2xl shadow-xl border border-neutral-100 bg-white/80 backdrop-blur p-8 pb-6">
      <CardContent className="min-h-0 flex flex-col space-y-6 p-0">

        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900 text-center">
          Few steps before you start
        </h1>
        <p className="text-sm text-neutral-700 text-center">
          Manage microphone access and select a meeting tab.
        </p>

        <div className="min-h-0 p-4 rounded-lg border bg-white/50 backdrop-blur">
          <Label className="mb-3 block text-sm font-medium">Microphone Permission</Label>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {microphonePermission === "granted" && (
                <>
                  <div className="w-2.5 h-2.5 bg-green-500 rounded-full shadow-sm" />
                  <span className="text-sm text-green-700 font-medium">Granted</span>
                </>
              )}

              {microphonePermission === "denied" && (
                <>
                  <div className="w-2.5 h-2.5 bg-red-500 rounded-full shadow-sm" />
                  <span className="text-sm text-red-700 font-medium">Denied</span>
                </>
              )}

              {(microphonePermission === "prompt" || microphonePermission === "checking") && (
                <>
                  <div className="w-2.5 h-2.5 bg-yellow-500 rounded-full shadow-sm" />
                  <span className="text-sm text-yellow-700 font-medium">
                    {microphonePermission === "checking" ? "Checking..." : "Not Requested"}
                  </span>
                </>
              )}
            </div>

            {microphonePermission !== "granted" && (
              <Button
                variant="secondary"
                size="sm"
                onClick={requestMicrophonePermission}
                disabled={loading || microphonePermission === "checking"}
                className="text-xs"
              >
                {loading ? "Requesting..." : "Request"}
              </Button>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Permission is required to start capturing audio.
          </p>
        </div>

        <div className="min-h-0 space-y-2">
          <Label className="text-sm font-medium">Select Video Call Tab</Label>
          {tabs.length === 0 ? (
            <div className="text-sm text-gray-500">
              No video call tabs found. Open Google Meet, Teams, or Zoom.
            </div>
          ) : (
            <select
              value={selectedTabId || ""}
              onChange={(e) => setSelectedTabId(Number(e.target.value))}
              disabled={isCapturing}
              className="w-full px-3 py-2 rounded-md border text-sm bg-white/70 backdrop-blur focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-gray-100"
            >
              {tabs.map((tab) => (
                <option key={tab.id} value={tab.id}>
                  {getTabName(tab)}
                </option>
              ))}
            </select>
          )}
          <Button onClick={loadTabs} variant="outline" size="sm" className="w-full">
            Refresh Tabs
          </Button>
        </div>

        {/* Start / Stop */}
        <div className="min-h-0">
          {!isCapturing ? (
            <Button
              onClick={handleStartCapture}
              disabled={
                loading ||
                !selectedTabId ||
                tabs.length === 0 ||
                microphonePermission !== "granted"
              }
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
            className={`
              p-3 rounded-md text-sm border
              ${isCapturing && !status?.includes("Error") && !error
                ? "bg-green-50 text-green-800 border-green-200"
                : (status?.toLowerCase().includes("error") || error)
                ? "bg-red-50 text-red-800 border-red-200"
                : "bg-blue-50 text-blue-800 border-blue-200"
              }
            `}
          >
            {error || status}
          </div>
        )}

      </CardContent>
    </Card>
  </motion.div>
</div>
  );
}
