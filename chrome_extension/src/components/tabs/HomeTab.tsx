import { Separator } from "@/components/ui/separator";
import { Flag as FlagIcon } from "lucide-react";
import { useMeeting } from "@/hooks/useMeeting";
import { useInterviewAnalysis } from "@/hooks/useInterviewAnalysis";
import {
  useMeetingEvents,
  type Define,
  type Flag,
  type SuggestedQuestion,
} from "@/contexts/MeetingEventsContext";

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
  const {
    questions,
    flags: contextFlags,
    defines,
    addQuestion,
    addFlag,
    addDefine,
  } = useMeetingEvents();

  const { flags: analysisFlags } = useInterviewAnalysis();

  const flags = [...analysisFlags, ...contextFlags];

  useMeeting({
    onNewSuggestedQuestion: addQuestion,
    onGreenFlag: (message) => addFlag(true, message),
    onRedFlag: (message) => addFlag(false, message),
    onDefineTerm: addDefine,
  });

  return (
    <div className="min-h-0 h-full w-full overflow-y-auto">
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
