import { useTranscripts } from "@/contexts/TranscriptContext";
import { FormData } from "@/types/index";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Download, FileText } from "lucide-react";
import logoImage from "@/public/tomo-ai-logo.PNG";
import { useState } from "react";

interface CompletionScreenProps {
  formData: FormData;
  onStartNew?: () => void;
}

export function CompletionScreen({ formData: _formData, onStartNew }: CompletionScreenProps) {
  const { committedTranscripts, clearTranscripts } = useTranscripts();
  const [pdfStatus, setPdfStatus] = useState<string>("");
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);

  const handleStartNew = () => {
    clearTranscripts();
    if (onStartNew) {
      onStartNew();
    }
  };

  const handleExport = () => {
    const fullTranscript = committedTranscripts
      .map((t) => {
        const timestamp = t.timestamp
          ? new Date(t.timestamp).toLocaleString()
          : "";
        const source = t.source === "microphone" ? "Recruiter" : "Applicant";
        return `[${timestamp}] ${source}: ${t.text}`;
      })
      .join("\n\n");

    const blob = new Blob([fullTranscript], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `interview-transcript-${new Date().toISOString().split("T")[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const buildFullTranscript = () => {
    return committedTranscripts
      .map((t) => {
        const timestamp = t.timestamp
          ? new Date(t.timestamp).toLocaleString()
          : "";
        const source = t.source === "microphone" ? "Recruiter" : "Applicant";
        return `[${timestamp}] ${source}: ${t.text}`;
      })
      .join("\n\n");
  };

  const base64ToBlob = (base64: string, contentType: string) => {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: contentType });
  };

  const handleDownloadPdf = async () => {
    if (isGeneratingPdf) return;
    setIsGeneratingPdf(true);
    setPdfStatus("Connecting to PDF service...");

    try {
      const transcriptText = buildFullTranscript();
      if (!transcriptText.trim()) {
        setPdfStatus("No transcript available to generate PDF.");
        setIsGeneratingPdf(false);
        return;
      }

      const ws = new WebSocket('ws://localhost:8000/ws');

      ws.onopen = () => {
        setPdfStatus("Sending transcript...");
        ws.send(transcriptText);
      };

      ws.onmessage = (event) => {
        try {
          const data = event.data as string;
          if (typeof data === "string") {
            if (data.startsWith("Status:")) {
              setPdfStatus(data.replace("Status:", "").trim());
              return;
            }
            if (data.startsWith("ERROR|")) {
              setPdfStatus(data.replace("ERROR|", "").trim());
              ws.close();
              setIsGeneratingPdf(false);
              return;
            }
          }

          const parsed = JSON.parse(data);
          if (parsed?.type === "event" && parsed?.event === "PDF_GENERATED") {
            const filename = parsed?.payload?.filename || "scorecard.pdf";
            const pdfBase64 = parsed?.payload?.pdfBytes;
            if (!pdfBase64) {
              setPdfStatus("PDF data missing from response.");
              ws.close();
              setIsGeneratingPdf(false);
              return;
            }

            setPdfStatus("Downloading PDF...");
            const blob = base64ToBlob(pdfBase64, "application/pdf");
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            setPdfStatus("PDF downloaded.");
            ws.close();
            setIsGeneratingPdf(false);
          }
        } catch (e) {
          console.error("Error handling PDF message:", e);
        }
      };

      ws.onerror = () => {
        setPdfStatus("Failed to connect to PDF service.");
        setIsGeneratingPdf(false);
      };

      ws.onclose = () => {
      };
    } catch {
      setPdfStatus('Internal server error. Try again later.');
      setIsGeneratingPdf(false);
    }
  };

  return (
    <div className="min-h-0 h-full w-full flex flex-col bg-gradient-to-br from-neutral-50 to-neutral-200 p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="min-h-0 flex-1 w-full mx-auto flex flex-col max-w-6xl"
      >

        <div className="mb-6 text-center">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="flex justify-center mb-4"
          >
            <div className="w-16 h-16 rounded-full bg-green-500 flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10 text-white" />
            </div>
          </motion.div>
          <h1 className="text-3xl font-bold tracking-tight text-neutral-900 mb-2">
            Interview Completed
          </h1>
          <p className="text-neutral-600">
            Your interview session has been successfully recorded and transcribed.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <Card className="bg-white/80 backdrop-blur shadow-sm border border-neutral-200">
            <CardContent className="p-5">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                  <Download className="w-6 h-6 text-purple-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-neutral-600 mb-1">Export</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleExport}
                    className="p-0 h-auto text-purple-600 hover:text-purple-700 font-medium"
                  >
                    Download Transcript
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur shadow-sm border border-neutral-200">
            <CardContent className="p-5">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <FileText className="w-6 h-6 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-neutral-600 mb-1">Scorecard Report</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleDownloadPdf}
                    disabled={isGeneratingPdf}
                    className="p-0 h-auto text-blue-600 hover:text-blue-700 font-medium"
                  >
                    {isGeneratingPdf ? "Generating..." : "Download PDF"}
                  </Button>
                  {pdfStatus && (
                    <div className="text-xs text-neutral-500 mt-1">{pdfStatus}</div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {onStartNew && (
          <div className="w-full mt-6 flex justify-center">
            <Button onClick={handleStartNew} variant="default" size="lg">
              Start New Interview
            </Button>
          </div>
        )}

        <div className="mt-8 flex justify-center">
          <motion.img
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.3 }}
            src={logoImage}
            alt="tomo AI"
            className="w-32 h-32 object-contain drop-shadow-sm"
          />
        </div>
      </motion.div>
    </div>
  );
}

export default CompletionScreen;

