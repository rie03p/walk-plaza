import { useEffect, useRef, useState } from "react";
import type { ServerMessage, ClientMessage } from "@plaza/shared";

export function useWebSocket(url: string) {
  const [isConnected, setIsConnected] = useState(false);
  const [myUserId, setMyUserId] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const listenersRef = useRef<((msg: ServerMessage) => void)[]>([]);

  useEffect(() => {
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      console.log("WebSocket connected");
    };

    ws.onmessage = (event) => {
      const msg: ServerMessage = JSON.parse(event.data);
      
      if (msg.type === "init") {
        setMyUserId(msg.userId);
      }

      listenersRef.current.forEach((listener) => listener(msg));
    };

    ws.onclose = () => {
      setIsConnected(false);
      console.log("WebSocket disconnected");
    };

    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
    };

    return () => {
      ws.close();
    };
  }, [url]);

  const send = (msg: ClientMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    }
  };

  const subscribe = (listener: (msg: ServerMessage) => void) => {
    listenersRef.current.push(listener);
    return () => {
      listenersRef.current = listenersRef.current.filter((l) => l !== listener);
    };
  };

  return { isConnected, myUserId, send, subscribe };
}
