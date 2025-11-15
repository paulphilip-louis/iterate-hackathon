import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

function App() {
  const [companyValues, setCompanyValues] = useState<string>("");
  const [jobDescription, setJobDescription] = useState<string>("");
  const [candidateLinkedInUrl, setCandidateLinkedInUrl] = useState<string>("");

  return (
    <div className="h-full w-full flex items-center justify-center">
      <div className="w-full max-w-md p-6 bg-white rounded-lg shadow-md">
        <h1 className="text-2xl font-bold text-center mb-4">
          Iterate Hackathon
        </h1>
        <Label className="mb-2">Company Values</Label>
        <Input
          className="mb-4"
          type="text"
          value={companyValues}
          onChange={(e) => setCompanyValues(e.target.value)}
        />
        <Label className="mb-2">Job Description</Label>
        <Input
          className="mb-4"
          type="text"
          value={jobDescription}
          onChange={(e) => setJobDescription(e.target.value)}
        />
        <Label className="mb-2">Candidate LinkedIn URL</Label>
        <Input
          className="mb-6"
          type="text"
          value={candidateLinkedInUrl}
          onChange={(e) => setCandidateLinkedInUrl(e.target.value)}
        />
        <Button className="w-full">Hop in!</Button>
      </div>
    </div>
  );
}

export default App;
