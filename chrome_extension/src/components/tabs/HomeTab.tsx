import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { useAudioCapture } from "@/hooks/useAudioCapture";
import { useTranscripts } from "@/contexts/TranscriptContext";

export function HomeTab() {
  const {
    isCapturing,
    status,
    loading,
    audioLevel,
    isTranscribing,
    stopCapture,
  } = useAudioCapture();
  const { partialTranscript } = useTranscripts();

  return (
    <div className="flex flex-col gap-4 h-full w-full p-4 overflow-hidden">
      {/* Capture Status Card */}
      {isCapturing && (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
              <h2 className="text-lg font-semibold">Recording</h2>
              {isTranscribing && (
                <>
                  <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
                  <span className="text-sm text-blue-700">Transcribing...</span>
                </>
              )}
            </div>
            <Button
              onClick={stopCapture}
              disabled={loading}
              variant="destructive"
              size="sm"
            >
              {loading ? "Stopping..." : "Stop Capture"}
            </Button>
          </div>
          {partialTranscript && (
            <div className="p-2 bg-blue-50 border border-blue-200 rounded text-sm text-blue-800 mb-2">
              {partialTranscript}
            </div>
          )}
          <div className="w-full bg-gray-200 rounded-full h-2 mb-1">
            <div
              className="bg-green-500 h-2 rounded-full transition-all duration-100"
              style={{ width: `${Math.min(audioLevel * 2, 100)}%` }}
            ></div>
          </div>
          <p className="text-xs text-center text-gray-500">
            Audio Level: {Math.round(audioLevel)}
          </p>
          {status && (
            <p className="text-xs text-gray-600 mt-2">{status}</p>
          )}
        </div>
      )}

      {/* TODO Card */}
      <div className="flex-1 bg-white rounded-lg border border-gray-200 shadow-sm p-4 min-h-0 flex flex-col">
        <h2 className="text-lg font-semibold mb-3">TODO</h2>
        <Separator className="mb-3" />
        <div className="space-y-2 overflow-y-auto flex-1 min-h-0">
          {/* TODO items will go here */}
        </div>
      </div>

      {/* Suggested Questions Card */}
      <div className="flex-1 bg-white rounded-lg border border-gray-200 shadow-sm p-4 min-h-0 flex flex-col">
        <h2 className="text-lg font-semibold mb-3">Suggested Questions</h2>
        <Separator className="mb-3" />
        <div className="space-y-2 overflow-y-auto flex-1 min-h-0">
          {/* Suggested questions will go here */}
        </div>
      </div>

      {/* Flags Card */}
      <div className="flex-1 bg-white rounded-lg border border-gray-200 shadow-sm p-4 min-h-0 flex flex-col">
        <h2 className="text-lg font-semibold mb-3">Flags</h2>
        <Separator className="mb-3" />
        <div className="space-y-2 overflow-y-auto flex-1 min-h-0">
          {/* Flags will go here */}
        </div>
      </div>
    </div>
  );
}

export default HomeTab;
