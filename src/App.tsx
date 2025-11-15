import { useState } from "react";
import { FormScreen } from "@/components/screens/FormScreen";
import { AudioCaptureScreen } from "@/components/screens/AudioCaptureScreen";
import type { FormData } from "@/types";

function App() {
  const [formData, setFormData] = useState<FormData | null>(null);

  const handleFormSubmit = (data: FormData) => {
    console.log("Form submitted:", data);
    setFormData(data);
  };

  if (!formData) {
    return <FormScreen onSubmit={handleFormSubmit} />;
  }

  return <AudioCaptureScreen />;
}

export default App;
