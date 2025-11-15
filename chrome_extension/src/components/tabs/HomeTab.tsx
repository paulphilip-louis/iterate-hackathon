import { Separator } from "@/components/ui/separator";
import { useState } from "react";
import { Button } from "../ui/button";
import { Flag } from "lucide-react";
import { useMeeting } from "@/hooks/useMeeting";
import { useTranscripts } from "@/contexts/TranscriptContext";
import { useAudioCapture } from "@/hooks/useAudioCapture";

/*
Event types:
  - TODO_CREATED -> list of todos (will not change)
  - TICK_TODO -> id of the todo to tick
  - NEW_SUGGESTED_QUESTION -> new suggested question
*/

interface Flag {
  id: string;
  isGreen: boolean;
  message: string;
}

interface SuggestedQuestion {
  id: string;
  message: string;
}

interface Define {
  id: string;
  message: string;
}

function DefineList({ defines }: { defines: Define[] }) {
  return (
    <div className="space-y-2 overflow-y-auto flex-1 min-h-0">
      {defines.map((define) => (
        <p key={define.id} className="animate-slide-in">
          {define.message}
        </p>
      ))}
    </div>
  );
}

function SuggestedQuestionList({
  questions,
}: {
  questions: SuggestedQuestion[];
}) {
  return (
    <div className="space-y-2 overflow-y-auto flex-1 min-h-0">
      {questions.map((question) => (
        <p key={question.id} className="animate-slide-in">
          {question.message}
        </p>
      ))}
    </div>
  );
}

function FlagList({ flags }: { flags: Flag[] }) {
  return (
    <div className="space-y-2 overflow-y-auto flex-1 min-h-0">
      {flags.map((flag) => (
        <div key={flag.id} className="flex items-center gap-2 animate-slide-in">
          <Flag
            className={`w-4 h-4 ${
              flag.isGreen ? "text-green-500" : "text-red-500"
            }`}
          />
          <p>{flag.message}</p>
        </div>
      ))}
    </div>
  );
}

export function HomeTab() {
  const [defines, setDefines] = useState<Define[]>([]);
  const [questions, setQuestions] = useState<SuggestedQuestion[]>([]);
  const [flags, setFlags] = useState<Flag[]>([]);
  const {
    isCapturing,
    status,
    loading,
    audioLevel,
    isTranscribing,
    stopCapture,
  } = useAudioCapture();
  const { partialTranscript } = useTranscripts();

  // Event handlers that will be called when WebSocket events arrive
  const handleNewSuggestedQuestion = (question: string) => {
    const newQuestion: SuggestedQuestion = {
      id: Date.now().toString(),
      message: question,
    };
    // Add to top (stack behavior)
    setQuestions((prev) => [newQuestion, ...prev]);
  };

  const handleGreenFlag = (message: string) => {
    const newFlag: Flag = {
      id: Date.now().toString(),
      isGreen: true,
      message,
    };
    // Add to top (stack behavior)
    setFlags((prev) => [newFlag, ...prev]);
  };

  const handleRedFlag = (message: string) => {
    const newFlag: Flag = {
      id: Date.now().toString(),
      isGreen: false,
      message,
    };
    // Add to top (stack behavior)
    setFlags((prev) => [newFlag, ...prev]);
  };

  const handleDefineTerm = (term: string, definition: string) => {
    const newDefine: Define = {
      id: Date.now().toString(),
      message: `${term}: ${definition}`,
    };
    // Add to top (stack behavior)
    setDefines((prev) => [newDefine, ...prev]);
  };

  // Connect to WebSocket and handle events
  useMeeting({
    onNewSuggestedQuestion: handleNewSuggestedQuestion,
    onGreenFlag: handleGreenFlag,
    onRedFlag: handleRedFlag,
    onDefineTerm: handleDefineTerm,
  });

  // Simulate receiving events (for testing - remove later when WebSocket is connected)
  const simulateSuggestedQuestion = () => {
    handleNewSuggestedQuestion("What are your thoughts on remote work?");
  };

  const simulateGreenFlag = () => {
    handleGreenFlag("Candidate shows strong communication skills");
  };

  const simulateRedFlag = () => {
    handleRedFlag("Candidate seems unprepared for technical questions");
  };

  const simulateDefineTerm = () => {
    handleDefineTerm(
      "API",
      "Application Programming Interface - a set of protocols for building software"
    );
  };

  return (
    <div className="h-full w-full overflow-y-auto">
      <div className="p-4 flex gap-2 flex-wrap">
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
        <Button onClick={simulateSuggestedQuestion} variant="outline" size="sm">
          Simulate Suggested Question
        </Button>
        <Button
          onClick={simulateGreenFlag}
          variant="outline"
          size="sm"
          className="bg-green-50 border-green-300"
        >
          Simulate Green Flag
        </Button>
        <Button
          onClick={simulateRedFlag}
          variant="outline"
          size="sm"
          className="bg-red-50 border-red-300"
        >
          Simulate Red Flag
        </Button>
        <Button onClick={simulateDefineTerm} variant="outline" size="sm">
          Simulate Define Term
        </Button>
      </div>
      <div className="flex flex-col gap-4 w-full p-4">
        {/* Suggested Questions Card */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 flex flex-col h-[200px]">
          <h2 className="text-lg font-semibold mb-3">Suggested Questions</h2>
          <Separator className="mb-3" />
          <div className="space-y-2 overflow-y-auto flex-1 min-h-0">
            <SuggestedQuestionList questions={questions} />
          </div>
        </div>

        {/* Flags Card */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 flex flex-col h-[200px]">
          <h2 className="text-lg font-semibold mb-3">Flags</h2>
          <Separator className="mb-3" />
          <div className="space-y-2 overflow-y-auto flex-1 min-h-0">
            <FlagList flags={flags} />
          </div>
        </div>

        {/* Define Card */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 flex flex-col h-[200px]">
          <h2 className="text-lg font-semibold mb-3">Define</h2>
          <Separator className="mb-3" />
          <div className="space-y-2 overflow-y-auto flex-1 min-h-0">
            <DefineList defines={defines} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default HomeTab;
