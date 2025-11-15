import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import type { FormData } from "@/types";

interface FormScreenProps {
  onSubmit: (data: FormData) => void;
}

export function FormScreen({ onSubmit }: FormScreenProps) {
  const [companyValues, setCompanyValues] = useState<string>("");
  const [jobDescription, setJobDescription] = useState<string>("");
  const [candidateLinkedInUrl, setCandidateLinkedInUrl] = useState<string>("");
  const [error, setError] = useState<string>("");

  const handleSubmit = () => {
    if (!companyValues.trim() || !jobDescription.trim() || !candidateLinkedInUrl.trim()) {
      setError("Please fill in all fields");
      return;
    }

    setError("");
    onSubmit({
      companyValues,
      jobDescription,
      candidateLinkedInUrl,
    });
  };

  const isFormValid = companyValues.trim() && jobDescription.trim() && candidateLinkedInUrl.trim();

  return (
    <div className="h-full w-full flex items-center justify-center p-4">
      <div className="w-full max-w-md p-6 bg-white rounded-lg shadow-md space-y-6">
        <div className="space-y-4">
          <div>
            <Label className="mb-2">Company Values</Label>
            <Input
              type="text"
              placeholder="Enter company values..."
              value={companyValues}
              onChange={(e) => setCompanyValues(e.target.value)}
            />
          </div>
          
          <div>
            <Label className="mb-2">Job Description</Label>
            <Input
              type="text"
              placeholder="Enter job description..."
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
            />
          </div>
          
          <div>
            <Label className="mb-2">Candidate LinkedIn URL</Label>
            <Input
              type="text"
              placeholder="https://linkedin.com/in/..."
              value={candidateLinkedInUrl}
              onChange={(e) => setCandidateLinkedInUrl(e.target.value)}
            />
          </div>
        </div>

        {error && (
          <div className="p-3 rounded text-sm bg-red-50 text-red-800 border border-red-200">
            {error}
          </div>
        )}

        <Button 
          onClick={handleSubmit}
          className="w-full"
          disabled={!isFormValid}
        >
          Hop in!
        </Button>
      </div>
    </div>
  );
}

