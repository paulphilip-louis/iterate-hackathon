import { useScript } from "@/contexts/ScriptContext";
import { useInterviewAnalysis } from "@/hooks/useInterviewAnalysis";
import { Check, Circle } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

const INTERVIEW_SCRIPT = [
  {
    id: 1,
    name: 'Personal Background',
    subsections: [
      { id: '1.1', label: 'Personal introduction' },
      { id: '1.2', label: 'Professional background summary' },
      { id: '1.3', label: 'Motivations & ambitions' },
      { id: '1.4', label: 'What they\'re looking for in a work environment' }
    ]
  },
  {
    id: 2,
    name: 'Company & Role Fit',
    subsections: [
      { id: '2.1', label: 'Why our company?' },
      { id: '2.2', label: 'Motivation for the role' },
      { id: '2.3', label: 'What they already know about the team / product' },
      { id: '2.4', label: 'Culture / management expectations' }
    ]
  },
  {
    id: 3,
    name: 'Technical Evaluation',
    subsections: [
      { id: '3.1', label: 'Technical project experience' },
      { id: '3.2', label: 'Architecture & design' },
      { id: '3.3', label: 'Specific skills' },
      { id: '3.4', label: 'Problem solving' }
    ]
  },
  {
    id: 4,
    name: 'Candidate Questions',
    subsections: [
      { id: '4.1', label: 'Questions about the team' },
      { id: '4.2', label: 'Questions about the roadmap' },
      { id: '4.3', label: 'Questions about compensation / process' }
    ]
  },
  {
    id: 5,
    name: 'Closing',
    subsections: [
      { id: '5.1', label: 'Summary' },
      { id: '5.2', label: 'Next steps' },
      { id: '5.3', label: 'Thank you / closing remarks' }
    ]
  }
];

export function TodosTab() {
  const { scriptState, setScriptState } = useScript();
  const { markSubsectionCompleted } = useInterviewAnalysis();

  const handleSubsectionToggle = (subsectionId: string, isCurrentlyCompleted: boolean) => {
    if (!isCurrentlyCompleted) {
      markSubsectionCompleted(subsectionId);
      if (scriptState) {
        setScriptState({
          ...scriptState,
          completedSubsections: {
            ...scriptState.completedSubsections,
            [subsectionId]: true,
          },
        });
      }
    }
  };

  return (
    <div className="flex flex-col gap-4 h-full w-full p-4 overflow-hidden">     
      <div className="flex items-center justify-end mb-2">
        {scriptState && (
          <div className="px-3 py-1 bg-neutral-100 text-neutral-700 text-sm rounded-full font-medium shadow-sm">
            {scriptState.progress.toFixed(0)}% Complete
          </div>
        )}
        {!scriptState && (
          <div className="px-3 py-1 bg-red-100 text-red-700 text-sm rounded-full font-medium shadow-sm">
            0% Complete
          </div>
        )}
      </div>
      <div className="flex-1 overflow-y-auto space-y-4">
        {INTERVIEW_SCRIPT.map((section) => {
          const isSectionCompleted = scriptState?.completedSections[section.id] || false;
          const isCurrentSection = scriptState?.currentSection === section.id;
          
          return (
            <div
              key={section.id}
              className={`bg-white rounded-lg border-2 p-4 ${
                isCurrentSection
                  ? 'border-blue-500 bg-blue-50'
                  : isSectionCompleted
                  ? 'border-green-300 bg-green-50'
                  : 'border-gray-200'
              }`}
            >
              <div className="flex items-center gap-2 mb-3">
                {isSectionCompleted ? (
                  <Check className="w-5 h-5 text-green-600" />
                ) : (
                  <Circle className="w-5 h-5 text-gray-400" />
                )}
                <h2 className={`text-lg font-semibold ${
                  isSectionCompleted ? 'line-through text-gray-500' : ''
                }`}>
                  {section.id}. {section.name}
                </h2>
                {isCurrentSection && (
                  <span className="text-xs bg-blue-500 text-white px-2 py-1 rounded">
                    Current
                  </span>
                )}
              </div>
              
              <div className="ml-7 space-y-2">
                {section.subsections.map((subsection) => {
                  const isCompleted = scriptState?.completedSubsections[subsection.id] || false;
                  const isCurrent = scriptState?.currentSubsection === subsection.id;
                  
                  return (
                    <div
                      key={subsection.id}
                      className={`flex items-center gap-2 text-sm ${
                        isCompleted ? 'line-through text-gray-500' : ''
                      } ${isCurrent ? 'font-semibold text-blue-600' : ''}`}
                    >
                      <Checkbox
                        id={subsection.id}
                        checked={isCompleted}
                        onCheckedChange={() => handleSubsectionToggle(subsection.id, isCompleted)}
                        className="w-4 h-4 flex-shrink-0 cursor-pointer"
                        disabled={isCompleted}
                      />
                      <label
                        htmlFor={subsection.id}
                        className={`flex-1 cursor-pointer ${isCurrent ? 'font-semibold text-blue-600' : ''}`}
                        onClick={() => !isCompleted && handleSubsectionToggle(subsection.id, isCompleted)}
                      >
                        {subsection.label}
                      </label>
                      {isCurrent && (
                        <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">
                          Now
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
