import { useState } from "react";
import { FormScreen, type FormData } from "@/components/screens/FormScreen";
import { AudioCaptureScreen } from "@/components/screens/AudioCaptureScreen";
import Home from "@/components/screens/HomeScreen";
import logoImage from "@/public/tomo-ai-logo.PNG";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";

type AppStep = "form" | "audioCapture" | "home";

function App() {
  const [step, setStep] = useState<AppStep>("form");
  const [formData, setFormData] = useState<FormData | null>(null);

  const handleFormSubmit = async (data: FormData) => {
    setFormData(data);
    setStep("audioCapture");
  };

  const handleAudioCaptureComplete = () => {
    setStep("home");
  };

  if (step === "home" && formData) {
    return <Home formData={formData} />;
  }

  if (step === "audioCapture") {
    return <AudioCaptureScreen onNext={handleAudioCaptureComplete} />;
  }

  return (
    <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-neutral-50 to-neutral-200 p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <Card className="rounded-2xl shadow-xl border border-neutral-100 bg-white/80 backdrop-blur p-8 pb-6">
          <CardContent className="flex flex-col items-center text-center space-y-6 p-0">
            <motion.img
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.4 }}
              src={logoImage}
              alt="tomo AI"
              className="w-40 h-40 object-contain drop-shadow-sm"
            />

            <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
              Real-Time Interview Companion for Recruiters
            </h1>

            <div className="w-full -mb-2">
              <FormScreen onSubmit={handleFormSubmit} />
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

export default App;
