import { useTranscripts } from "@/contexts/TranscriptContext";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic } from "lucide-react";

function useTypingEffect(text: string, speed: number = 30) {
  const [displayedText, setDisplayedText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const previousTextRef = useRef("");

  useEffect(() => {
    if (!text) {
      setDisplayedText("");
      setIsTyping(false);
      previousTextRef.current = "";
      return;
    }

    if (text.length < displayedText.length) {
      setDisplayedText(text);
      previousTextRef.current = text;
      return;
    }

    if (text === previousTextRef.current) {
      return;
    }

    setIsTyping(true);
    const currentLength = displayedText.length;
    const targetLength = text.length;
    let index = currentLength;

    const interval = setInterval(() => {
      if (index < targetLength) {
        setDisplayedText(text.slice(0, index + 1));
        index++;
      } else {
        setIsTyping(false);
        previousTextRef.current = text;
        clearInterval(interval);
      }
    }, speed);

    return () => clearInterval(interval);
  }, [text, speed, displayedText.length]);

  return { displayedText, isTyping };
}

interface TranscriptItemProps {
  transcript: {
    id: string;
    text: string;
    timestamp?: number;
  };
  isPartial?: boolean;
}

function TranscriptItem({ transcript, isPartial = false }: TranscriptItemProps) {
  const { displayedText, isTyping } = useTypingEffect(transcript.text, 20);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`rounded-xl border p-4 ${
        isPartial
          ? "bg-blue-50/50 border-blue-200 shadow-sm"
          : "bg-white/80 border-neutral-200 shadow-sm"
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-1">
          {isPartial ? (
            <div className="relative">
              <Mic className="w-4 h-4 text-blue-500" />
              <div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
            </div>
          ) : (
            <div className="w-4 h-4 rounded-full bg-neutral-300" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span
              className={`text-xs font-medium ${
                isPartial ? "text-blue-600" : "text-neutral-500"
              }`}
            >
              {transcript.timestamp
                ? new Date(transcript.timestamp).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                  })
                : "Now"}
            </span>
            {isPartial && (
              <span className="text-xs text-blue-500 font-medium">
                Live...
              </span>
            )}
          </div>
          <p
            className={`text-sm leading-relaxed ${
              isPartial ? "text-neutral-800" : "text-neutral-900"
            }`}
          >
            {displayedText}
            {isTyping && (
              <motion.span
                animate={{ opacity: [1, 0] }}
                transition={{
                  duration: 0.8,
                  repeat: Infinity,
                  repeatType: "reverse",
                }}
                className="inline-block w-0.5 h-4 bg-blue-500 ml-1 align-middle"
              />
            )}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

export function TranscriptTab() {
  const { partialTranscript, committedTranscripts } = useTranscripts();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);

  useEffect(() => {
    if (shouldAutoScroll && scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const scrollToBottom = () => {
        container.scrollTo({
          top: container.scrollHeight,
          behavior: "smooth",
        });
      };

      const timeoutId = setTimeout(scrollToBottom, 100);
      return () => clearTimeout(timeoutId);
    }
  }, [committedTranscripts, partialTranscript, shouldAutoScroll]);

  const handleScroll = () => {
    if (scrollContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } =
        scrollContainerRef.current;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
      setShouldAutoScroll(isNearBottom);
    }
  };

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
            <p className="text-xs text-neutral-400">
              Start capturing audio to see live transcription here
            </p>
          </div>
        )}

        <AnimatePresence>
          {committedTranscripts.map((transcript) => (
            <TranscriptItem key={transcript.id} transcript={transcript} />
          ))}
        </AnimatePresence>

        {partialTranscript && (
          <TranscriptItem
            transcript={{
              id: "partial",
              text: partialTranscript,
              timestamp: Date.now(),
            }}
            isPartial={true}
          />
        )}

        {/* Scroll indicator when not auto-scrolling */}
        {!shouldAutoScroll && hasContent && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="fixed bottom-20 right-8 z-10"
          >
            <button
              onClick={() => {
                setShouldAutoScroll(true);
                scrollContainerRef.current?.scrollTo({
                  top: scrollContainerRef.current.scrollHeight,
                  behavior: "smooth",
                });
              }}
              className="px-4 py-2 bg-blue-500 text-white text-sm rounded-lg shadow-lg hover:bg-blue-600 transition-colors"
            >
              Scroll to bottom
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
}

export default TranscriptTab;