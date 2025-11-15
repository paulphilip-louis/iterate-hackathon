import { useState } from "react";

function App() {
  const [message, setMessage] = useState<string>("");

  const handleClick = () => {
    setMessage("Hello from Chrome Extension!");
  };

  return (
    <div className="w-80 p-5 text-center font-sans">
      <h1 className="text-2xl font-bold text-gray-800 mb-2">Hello World!</h1>
      <p className="text-gray-600 mb-4">This is a Chrome extension.</p>
      <button
        id="clickBtn"
        onClick={handleClick}
        className="bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white font-medium py-2 px-5 rounded transition-colors duration-200 mt-2"
      >
        Click Me
      </button>
      {message && (
        <p className="mt-4 font-semibold text-green-600 min-h-[20px]">
          {message}
        </p>
      )}
    </div>
  );
}

export default App;
