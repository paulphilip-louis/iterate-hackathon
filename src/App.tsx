import { useState } from "react";
import { FormScreen, type FormData } from "@/components/screens/FormScreen";
import { AudioCaptureScreen } from "@/components/screens/AudioCaptureScreen";
import Home from "@/components/screens/HomeScreen";

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
    <div className="h-full w-full flex items-center justify-center">
      <div className="w-full max-w-md p-6 bg-white rounded-lg shadow-md">
        <h1 className="text-2xl font-bold text-center mb-4">
          Iterate Hackathon
        </h1>
        <FormScreen onSubmit={handleFormSubmit} />
      </div>
    </div>
  );
}

export default App;
