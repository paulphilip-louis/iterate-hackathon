import { Separator } from "@/components/ui/separator";
import { useState } from "react";
import { Flag as FlagIcon } from "lucide-react";
import { useMeeting } from "@/hooks/useMeeting";
import { useInterviewAnalysis } from "@/hooks/useInterviewAnalysis";

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
          <FlagIcon
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
  console.log("🏠 HomeTab component rendered");

  const [defines, setDefines] = useState<Define[]>([]);
  const [questions, setQuestions] = useState<SuggestedQuestion[]>([]);
  const [manualFlags, setManualFlags] = useState<Flag[]>([]);

  // Get flags from interview analysis service
  // Script state is now updated directly in the context by useInterviewAnalysis
  const { flags: analysisFlags } = useInterviewAnalysis();

  console.log(`🏁 HomeTab: analysisFlags count = ${analysisFlags.length}`);

  // Combine manual flags (from useMeeting) with analysis flags
  const flags = [...analysisFlags, ...manualFlags];
  console.log(`🚩 HomeTab: total flags = ${flags.length}`);

  const handleNewSuggestedQuestion = (question: string) => {
    const newQuestion: SuggestedQuestion = {
      id: Date.now().toString(),
      message: question,
    };
    setQuestions((prev) => [newQuestion, ...prev]);
  };

  const handleGreenFlag = (message: string) => {
    const newFlag: Flag = {
      id: Date.now().toString(),
      isGreen: true,
      message,
    };
    setManualFlags((prev) => [newFlag, ...prev]);
  };

  const handleRedFlag = (message: string) => {
    const newFlag: Flag = {
      id: Date.now().toString(),
      isGreen: false,
      message,
    };
    setManualFlags((prev) => [newFlag, ...prev]);
  };

  const handleDefineTerm = (term: string, definition: string) => {
    const newDefine: Define = {
      id: Date.now().toString(),
      message: `${term}: ${definition}`,
    };
    setDefines((prev) => [newDefine, ...prev]);
  };

  useMeeting({
    onNewSuggestedQuestion: handleNewSuggestedQuestion,
    onGreenFlag: handleGreenFlag,
    onRedFlag: handleRedFlag,
    onDefineTerm: handleDefineTerm,
  });

  return (
    <div className="min-h-0 h-full w-full overflow-y-auto">
      <div className="min-h-0 p-4 flex gap-2 flex-wrap"></div>
      <div className="min-h-0 flex flex-col gap-4 w-full p-4">
        <div className="min-h-0 bg-white rounded-lg border border-gray-200 shadow-sm p-4 flex flex-col h-[200px]">
          <h2 className="text-lg font-semibold mb-3">Suggested Questions</h2>
          <Separator className="mb-3" />
          <div className="space-y-2 overflow-y-auto flex-1 min-h-0">
            <SuggestedQuestionList questions={questions} />
          </div>
        </div>

        <div className="min-h-0 bg-white rounded-lg border border-gray-200 shadow-sm p-4 flex flex-col h-[200px]">
          <h2 className="text-lg font-semibold mb-3">Flags</h2>
          <Separator className="mb-3" />
          <div className="space-y-2 overflow-y-auto flex-1 min-h-0">
            <FlagList flags={flags} />
          </div>
        </div>

        <div className="min-h-0 bg-white rounded-lg border border-gray-200 shadow-sm p-4 flex flex-col h-[200px]">
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
