import { useState } from "react";
import { FormScreen, type FormData } from "@/components/screens/FormScreen";
import Home from "@/components/screens/HomeScreen";

// TODO: remove that for prod, just to dev
const tempFormData: FormData = {
  companyValues: "Company Values",
  jobDescription: "Job Description",
  candidateLinkedInUrl: "https://www.linkedin.com/in/candidate",
};

function App() {
  const [formData, setFormData] = useState<FormData | null>(null);

  const handleSubmit = async (data: FormData) => {
    setFormData(data);
  };

  return !formData ? (
    <Home formData={tempFormData} />
  ) : (
    <div className="h-full w-full flex items-center justify-center">
      <div className="w-full max-w-md p-6 bg-white rounded-lg shadow-md">
        <h1 className="text-2xl font-bold text-center mb-4">
          Iterate Hackathon
        </h1>
        <FormScreen onSubmit={handleSubmit} />
      </div>
    </div>
  );
}

export default App;
