import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import { StrictMode } from "react";
import { TranscriptProvider } from "./contexts/TranscriptContext";
import { MeetingEventsProvider } from "./contexts/MeetingEventsContext";
import { ScriptProvider } from "./contexts/ScriptContext";
import { InterviewAnalysisProvider } from "./contexts/InterviewAnalysisContext";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <TranscriptProvider>
      <ScriptProvider>
        <InterviewAnalysisProvider>
          <MeetingEventsProvider>
            <App />
          </MeetingEventsProvider>
        </InterviewAnalysisProvider>
      </ScriptProvider>
    </TranscriptProvider>
  </StrictMode>
);
