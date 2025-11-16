import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import { StrictMode } from "react";
import { TranscriptProvider } from "./contexts/TranscriptContext";
import { MeetingEventsProvider } from "./contexts/MeetingEventsContext";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <TranscriptProvider>
      <MeetingEventsProvider>
        <App />
      </MeetingEventsProvider>
    </TranscriptProvider>
  </StrictMode>
);
