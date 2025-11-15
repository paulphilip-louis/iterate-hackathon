import { useTranscripts } from "@/contexts/TranscriptContext";

export default function TranscriptTab() {
  const { partialTranscript, committedTranscripts } = useTranscripts();

  return (
    <div className="w-full h-full flex flex-col p-4 overflow-hidden">
      <h2 className="text-xl font-bold mb-4">Transcript</h2>
      
      <div className="flex-1 overflow-y-auto space-y-4">
        {/* Committed transcripts */}
        {committedTranscripts.length > 0 && (
          <div className="space-y-3">
            {committedTranscripts.map((transcript) => (
              <div
                key={transcript.id}
                className="p-3 bg-gray-50 rounded-lg border border-gray-200"
              >
                <p className="text-sm text-gray-600 mb-1">
                  {transcript.timestamp
                    ? new Date(transcript.timestamp).toLocaleTimeString()
                    : ""}
                </p>
                <p className="text-base text-gray-900">{transcript.text}</p>
              </div>
            ))}
          </div>
        )}

        {/* Partial transcript (live) */}
        {partialTranscript && (
          <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-600 mb-1">Live transcription...</p>
            <p className="text-base text-gray-900 italic">{partialTranscript}</p>
          </div>
        )}

        {/* Empty state */}
        {committedTranscripts.length === 0 && !partialTranscript && (
          <div className="flex items-center justify-center h-full text-gray-500">
            <p>No transcripts yet. Start capturing audio to see transcripts here.</p>
          </div>
        )}
      </div>
    </div>
  );
}
