import { useTranscripts, TranscriptSource } from "@/contexts/TranscriptContext";
import { useEffect, useRef, useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Mic, User, Monitor } from "lucide-react";

interface TranscriptItemProps {
  transcript: {
    id: string;
    text: string;
    timestamp?: number;
    source?: TranscriptSource;
  };
  isPartial?: boolean;
}

function TranscriptItem({ transcript, isPartial = false }: TranscriptItemProps) {
  const source = transcript.source || 'tab';
  const isRecruiter = source === 'microphone';

  return (
    <div className={`flex gap-3 ${isRecruiter ? 'flex-row-reverse' : 'flex-row'}`}>
      {/* Avatar */}
      <div className="flex-shrink-0">
        {isPartial ? (
          <div className="relative">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              isRecruiter ? 'bg-blue-500' : 'bg-green-500'
            }`}>
              {isRecruiter ? (
                <User className="w-4 h-4 text-white" />
              ) : (
                <Monitor className="w-4 h-4 text-white" />
              )}
            </div>
            <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-blue-500 rounded-full animate-pulse border-2 border-white" />
          </div>
        ) : (
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
            isRecruiter ? 'bg-blue-500' : 'bg-green-500'
          }`}>
            {isRecruiter ? (
              <User className="w-4 h-4 text-white" />
            ) : (
              <Monitor className="w-4 h-4 text-white" />
            )}
          </div>
        )}
      </div>

      {/* Message bubble */}
      <div className={`flex flex-col ${isRecruiter ? 'items-end' : 'items-start'} max-w-[75%]`}>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-medium text-neutral-600">
            {isRecruiter ? 'Recruiter' : 'Applicant'}
          </span>
          <span className="text-xs text-neutral-400">
            {transcript.timestamp
              ? new Date(transcript.timestamp).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "Now"}
          </span>
          {isPartial && (
            <span className="text-xs text-blue-500 font-medium">
              Live...
            </span>
          )}
        </div>
        <div
          className={`rounded-2xl px-4 py-2.5 shadow-sm ${
            isPartial
              ? isRecruiter
                ? "bg-blue-50/50 border border-blue-200"
                : "bg-green-50/50 border border-green-200"
              : isRecruiter
              ? "bg-blue-500 text-white"
              : "bg-white border border-neutral-200 text-neutral-900"
          }`}
        >
          <p className={`text-sm leading-relaxed ${
            isRecruiter && !isPartial ? 'text-white' : 'text-neutral-900'
          }`}>
            {transcript.text}
          </p>
        </div>
      </div>
    </div>
  );
}

export function TranscriptTab() {
  const { partialTranscript, committedTranscripts } = useTranscripts();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);

  useEffect(() => {
    if (shouldAutoScroll && scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const scrollToTop = () => {
        container.scrollTo({
          top: 0,
          behavior: "smooth",
        });
      };

      const timeoutId = setTimeout(scrollToTop, 100);
      return () => clearTimeout(timeoutId);
    }
  }, [committedTranscripts, partialTranscript, shouldAutoScroll]);

  const handleScroll = () => {
    if (scrollContainerRef.current) {
      const { scrollTop } = scrollContainerRef.current;
      const isNearTop = scrollTop < 100;
      setShouldAutoScroll(isNearTop);
    }
  };

  // Reverse transcripts to show newest first
  const reversedTranscripts = useMemo(
    () => [...committedTranscripts].reverse(),
    [committedTranscripts]
  );

  const hasContent = committedTranscripts.length > 0 || partialTranscript;

  return (
    <div className="min-h-0 w-full h-full flex flex-col overflow-hidden">
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="min-h-0 flex-1 overflow-y-auto p-4 space-y-3"
      >
        {!hasContent && (
          <div className="min-h-0 flex flex-col items-center justify-center h-full text-center">
            <Mic className="w-16 h-16 text-neutral-300 mb-4" />
            <p className="text-sm text-neutral-500 mb-1">
              No transcripts yet
            </p>
          </div>
        )}

        {/* Partial transcript (newest) at top */}
        {partialTranscript && (
          <TranscriptItem
            transcript={{
              id: "partial",
              text: partialTranscript,
              timestamp: Date.now(),
              source: 'tab', // Default to tab for partial transcripts
            }}
            isPartial={true}
          />
        )}

        {/* Committed transcripts (newest first) */}
        {reversedTranscripts.map((transcript) => (
          <TranscriptItem key={transcript.id} transcript={transcript} />
        ))}

        {/* Scroll indicator when not auto-scrolling */}
        {!shouldAutoScroll && hasContent && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="fixed top-20 right-8 z-10"
          >
            <button
              onClick={() => {
                setShouldAutoScroll(true);
                scrollContainerRef.current?.scrollTo({
                  top: 0,
                  behavior: "smooth",
                });
              }}
              className="px-4 py-2 bg-purple-300 text-white text-sm rounded-lg shadow-lg hover:bg-purple-400 transition-colors"
            >
              Scroll to top
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
}

export default TranscriptTab;