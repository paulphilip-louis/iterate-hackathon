// Utility to manage WebSocket connection to question generation service

let wsRef: WebSocket | null = null;
let connectionPromise: Promise<void> | null = null;
let messageHandlers: Set<(data: any) => void> = new Set();

const QUESTION_GEN_WS_URL =
  import.meta.env.VITE_QUESTION_GEN_WS_URL || "ws://localhost:8001/ws";

export function getQuestionGenWebSocket(): WebSocket | null {
  return wsRef;
}

export function connectToQuestionGen(): Promise<WebSocket> {
  // If already connected, return the existing connection
  if (wsRef && wsRef.readyState === WebSocket.OPEN) {
    return Promise.resolve(wsRef);
  }

  // If connection is in progress, wait for it
  if (connectionPromise) {
    return connectionPromise.then(() => {
      if (wsRef && wsRef.readyState === WebSocket.OPEN) {
        return wsRef;
      }
      throw new Error("Connection failed");
    });
  }

  // Start new connection
  connectionPromise = new Promise((resolve, reject) => {
    try {
      const ws = new WebSocket(QUESTION_GEN_WS_URL);
      wsRef = ws;

      ws.onopen = () => {
        console.log("✅ Connected to question generation service");
        connectionPromise = null;
        resolve();
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log("📨 Received message from question generation service:", data);
          // Notify all registered handlers
          messageHandlers.forEach((handler) => {
            try {
              handler(data);
            } catch (error) {
              console.error("❌ Error in message handler:", error);
            }
          });
        } catch (error) {
          console.error("❌ Error parsing message from question generation service:", error);
        }
      };

      ws.onerror = (error) => {
        console.error("❌ Question generation WebSocket error:", error);
        connectionPromise = null;
        reject(error);
      };

      ws.onclose = () => {
        console.log("🔌 Disconnected from question generation service");
        wsRef = null;
        connectionPromise = null;
      };
    } catch (error) {
      console.error("❌ Error connecting to question generation service:", error);
      connectionPromise = null;
      reject(error);
    }
  });

  return connectionPromise.then(() => {
    if (wsRef && wsRef.readyState === WebSocket.OPEN) {
      return wsRef;
    }
    throw new Error("Connection failed");
  });
}

export function sendToQuestionGen(data: any): boolean {
  if (wsRef && wsRef.readyState === WebSocket.OPEN) {
    try {
      const message = typeof data === 'string' ? data : JSON.stringify(data);
      wsRef.send(message);
      return true;
    } catch (error) {
      console.error("❌ Error sending to question generation service:", error);
      return false;
    }
  }
  // If not connected, the caller should connect first
  return false;
}

export function disconnectFromQuestionGen() {
  if (wsRef) {
    wsRef.close();
    wsRef = null;
  }
  connectionPromise = null;
  messageHandlers.clear();
}

// Register a handler to receive messages from question generation service
export function onQuestionGenMessage(handler: (data: any) => void): () => void {
  messageHandlers.add(handler);
  // Return unsubscribe function
  return () => {
    messageHandlers.delete(handler);
  };
}

