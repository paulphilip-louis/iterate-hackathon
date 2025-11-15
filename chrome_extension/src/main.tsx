import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import { StrictMode } from "react";
import { TranscriptProvider } from "./contexts/TranscriptContext";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <TranscriptProvider>
      <App />
    </TranscriptProvider>
  </StrictMode>
);
