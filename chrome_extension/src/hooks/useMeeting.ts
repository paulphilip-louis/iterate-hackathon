import { useEffect, useCallback, useRef } from "react";
import {
  meetingEventSchema,
  type MeetingEvent,
} from "@/schemas/meetingEvents";

// WebSocket URL for meeting events (3rd party service)
const MEETING_WS_URL =
  import.meta.env.MEETING_WS_URL;

interface UseMeetingCallbacks {
  onNewSuggestedQuestion?: (question: string) => void;
  onGreenFlag?: (message: string) => void;
  onRedFlag?: (message: string) => void;
  onDefineTerm?: (term: string, definition: string) => void;
  onTodoCreated?: (todos: Array<{ id: string; message: string }>) => void;
  onTickTodo?: (todoId: string) => void;
  onConnectionChange?: (connected: boolean) => void;
}

export function useMeeting(callbacks: UseMeetingCallbacks) {
  const {
    onNewSuggestedQuestion,
    onGreenFlag,
    onRedFlag,
    onDefineTerm,
    onTodoCreated,
    onTickTodo,
    onConnectionChange,
  } = callbacks;

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;
  const reconnectDelay = 3000; // 3 seconds

  const handleWebSocketMessage = useCallback(
    (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);

        // Validate the event with Zod
        const result = meetingEventSchema.safeParse(data);

        if (!result.success) {
          console.warn("Invalid event received:", result.error);
          return;
        }

        const validatedEvent: MeetingEvent = result.data;

        // Handle different event types
        switch (validatedEvent.event) {
          case "NEW_SUGGESTED_QUESTION":
            onNewSuggestedQuestion?.(validatedEvent.payload.question);
            break;

          case "GREEN_FLAG":
            onGreenFlag?.(validatedEvent.payload.message);
            break;

          case "RED_FLAG":
            onRedFlag?.(validatedEvent.payload.message);
            break;

          case "DEFINE_TERM":
            onDefineTerm?.(
              validatedEvent.payload.term,
              validatedEvent.payload.definition
            );
            break;

          case "TODO_CREATED":
            onTodoCreated?.(validatedEvent.payload.todos);
            break;

          case "TICK_TODO":
            onTickTodo?.(validatedEvent.payload.id);
            break;

          default:
            console.warn("Unknown event type:", validatedEvent);
        }
      } catch (error) {
        console.error("Error parsing WebSocket message:", error);
      }
    },
    [
      onNewSuggestedQuestion,
      onGreenFlag,
      onRedFlag,
      onDefineTerm,
      onTodoCreated,
      onTickTodo,
    ]
  );

  const connect = useCallback(() => {
    // Don't reconnect if already connected
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    // Clear any pending reconnect attempts
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    try {
      console.log("Connecting to meeting events WebSocket:", MEETING_WS_URL);
      const ws = new WebSocket(MEETING_WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log("✅ Connected to meeting events service");
        reconnectAttemptsRef.current = 0;
        onConnectionChange?.(true);
      };

      ws.onmessage = handleWebSocketMessage;

      ws.onerror = (error) => {
        console.error("Meeting events WebSocket error:", error);
      };

      ws.onclose = (event) => {
        console.log("Meeting events WebSocket closed", event.code, event.reason);
        onConnectionChange?.(false);
        wsRef.current = null;

        // Attempt to reconnect if not a normal closure
        if (event.code !== 1000 && reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current++;
          console.log(
            `Attempting to reconnect (${reconnectAttemptsRef.current}/${maxReconnectAttempts})...`
          );
          reconnectTimeoutRef.current = window.setTimeout(() => {
            connect();
          }, reconnectDelay);
        } else if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
          console.error("Max reconnection attempts reached. Please refresh the page.");
        }
      };
    } catch (error) {
      console.error("Error creating WebSocket connection:", error);
      onConnectionChange?.(false);
    }
  }, [handleWebSocketMessage, onConnectionChange]);

  useEffect(() => {
    connect();

    return () => {
      // Cleanup: close WebSocket and clear reconnect timeout
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      if (wsRef.current) {
        wsRef.current.close(1000, "Component unmounting");
        wsRef.current = null;
      }
    };
  }, [connect]);
}

