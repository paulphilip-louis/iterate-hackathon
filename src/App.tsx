import { IterateForm, type FormData } from "@/components/IterateForm";
import { useGoogleMeet } from "@/hooks/useGoogleMeet";

function App() {
  const { isOnGoogleMeet, loading, currentTabUrl } = useGoogleMeet();

  const handleSubmit = async (data: FormData) => {
    console.log("Form data:", data);
    // Handle form submission here
  };

  if (loading) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <div className="text-center">Checking current tab...</div>
      </div>
    );
  }

  return (
    <div className="h-full w-full flex items-center justify-center">
      <div className="w-full max-w-md p-6 bg-white rounded-lg shadow-md">
        <h1 className="text-2xl font-bold text-center mb-4">
          Iterate Hackathon
        </h1>
        {isOnGoogleMeet ? (
          <IterateForm onSubmit={handleSubmit} />
        ) : (
          <div className="text-center space-y-4">
            <div className="p-4 bg-yellow-100 border border-yellow-400 text-yellow-800 rounded">
              <p className="font-semibold mb-2">⚠ Not on a Google Meet page</p>
              <p className="text-sm">
                Please navigate to a Google Meet, then close and reopen this
                extension.
              </p>
              <p className="text-sm">Current tab URL: {currentTabUrl}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
