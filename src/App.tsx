import { useState } from "react";
import { IterateForm, type FormData } from "@/components/IterateForm";
import { AudioCaptureScreen } from "@/components/screens/AudioCaptureScreen";

function App() {
  const [formData, setFormData] = useState<FormData | null>(null);

  const handleSubmit = async (data: FormData) => {
    console.log("Form data:", data);
    setFormData(data);
  };

  // Show form first
  if (!formData) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <div className="w-full max-w-md p-6 bg-white rounded-lg shadow-md">
          <h1 className="text-2xl font-bold text-center mb-4">
            Iterate Hackathon
          </h1>
          <IterateForm onSubmit={handleSubmit} />
        </div>
      </div>
    );
  }

  // Show audio capture screen after form submission
  return <AudioCaptureScreen />;
}

export default App;
