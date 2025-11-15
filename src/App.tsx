import { IterateForm, type FormData } from "@/components/IterateForm";
import { useState } from "react";
import Home from "./Home";

function App() {
  const [isFormComplete, setIsFormComplete] = useState(false);
  const [formData, setFormData] = useState<FormData | null>(null);

  const handleSubmit = async (data: FormData) => {
    setIsFormComplete(true);
    setFormData(data);
  };

  return (
    <>
      {isFormComplete && formData ? (
        <Home formData={formData} />
      ) : (
        <div className="h-full w-full flex items-center justify-center">
          <div className="w-full max-w-md p-6 bg-white rounded-lg shadow-md">
            <h1 className="text-2xl font-bold text-center mb-4">
              Iterate Hackathon
            </h1>
            <IterateForm onSubmit={handleSubmit} />
          </div>
        </div>
      )}
    </>
  );
}

export default App;
