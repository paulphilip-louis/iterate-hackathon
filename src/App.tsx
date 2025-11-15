import { IterateForm, type FormData } from "@/components/IterateForm";

function App() {
  const handleSubmit = async (data: FormData) => {
    console.log("Form data:", data);
    // Handle form submission here
  };

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

export default App;
