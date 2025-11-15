import { useState, useRef, useEffect, useCallback } from "react";

interface LogEntry {
  id: number;
  message: string;
  timestamp: Date;
  type: 'warning' | 'info' | 'error';
}

function App() {
  const [culturalFitScore, setCulturalFitScore] = useState<string>("—");
  const [contradictionScore, setContradictionScore] = useState<string>("—");
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const logIdCounter = useRef(0);

  const addLog = useCallback((message: string, type: LogEntry['type'] = 'info') => {
    setLogs((prev) => [
      ...prev.slice(-9), // Keep last 10 entries
      {
        id: logIdCounter.current++,
        message,
        timestamp: new Date(),
        type,
      },
    ]);
  }, []);

  // Simulate receiving updates (replace with actual IPC in production)
  useEffect(() => {
    // Example: Add a test log after 2 seconds
    const timer = setTimeout(() => {
      addLog('System initialized', 'info');
    }, 2000);

    return () => clearTimeout(timer);
  }, [addLog]);

  // For demonstration - in production, these would come from IPC
  const updateScores = () => {
    setCulturalFitScore("85%");
    setContradictionScore("12%");
    addLog('Cultural fit analysis complete', 'info');
    addLog('Minor contradiction detected in work history', 'warning');
  };

  return (
    <div className="w-[350px] h-[600px] bg-white/20 backdrop-blur-xl rounded-xl shadow-2xl overflow-hidden flex flex-col">
      {/* Header */}
      <div className="bg-black/20 px-4 py-3 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-white">AI Interview Assistant</h1>
        <div className="flex gap-2">
          <button
            className="w-3 h-3 rounded-full bg-yellow-500 hover:bg-yellow-400 transition-colors"
            onClick={() => updateScores()}
            title="Test Update"
          />
          <button
            className="w-3 h-3 rounded-full bg-red-500 hover:bg-red-400 transition-colors"
            onClick={() => {
              // Close button (functionality to be implemented)
            }}
            title="Close"
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-4 flex flex-col gap-4 overflow-hidden">
        {/* Score Boxes */}
        <div className="grid grid-cols-1 gap-3">
          <div className="bg-white/30 backdrop-blur-sm rounded-lg p-4 border border-white/20">
            <div className="text-sm text-white/80 mb-1">Cultural Fit Score</div>
            <div className="text-2xl font-bold text-white">{culturalFitScore}</div>
          </div>
          <div className="bg-white/30 backdrop-blur-sm rounded-lg p-4 border border-white/20">
            <div className="text-sm text-white/80 mb-1">Contradiction Score</div>
            <div className="text-2xl font-bold text-white">{contradictionScore}</div>
          </div>
        </div>

        {/* Log Area */}
        <div className="flex-1 flex flex-col min-h-0">
          <div className="text-sm font-semibold text-white/90 mb-2">Activity Log</div>
          <div className="flex-1 bg-black/20 backdrop-blur-sm rounded-lg p-3 overflow-y-auto space-y-2">
            {logs.length === 0 ? (
              <div className="text-white/60 text-sm text-center py-4">
                No activity yet...
              </div>
            ) : (
              logs.map((log) => (
                <div
                  key={log.id}
                  className={`text-xs p-2 rounded ${
                    log.type === 'warning'
                      ? 'bg-yellow-500/20 text-yellow-200'
                      : log.type === 'error'
                      ? 'bg-red-500/20 text-red-200'
                      : 'bg-blue-500/20 text-blue-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="flex-1">{log.message}</span>
                    <span className="text-white/40 text-[10px] whitespace-nowrap">
                      {log.timestamp.toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
