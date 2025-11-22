export interface Env {
  ROOM: DurableObjectNamespace;
}

const ALLOWED_ORIGINS = [
  "https://walk-chat-plaza.pages.dev",
  // "http://localhost:5173", // 開発環境用
];

function isOriginAllowed(origin: string | null): boolean {
  if (!origin) return false;
  return ALLOWED_ORIGINS.some(allowed => origin === allowed || origin.startsWith(allowed));
}

export default {
  async fetch(request: Request, env: Env) {
    const origin = request.headers.get("Origin");
    
    // OriginチェックWebSocketアップグレード以外のリクエスト
    if (!isOriginAllowed(origin) && request.headers.get("Upgrade") !== "websocket") {
      return new Response("Forbidden", { status: 403 });
    }

    const url = new URL(request.url);

    if (url.pathname === "/ws") {
      // WebSocketリクエストのOriginチェック
      if (!isOriginAllowed(origin)) {
        return new Response("Forbidden", { status: 403 });
      }
      
      const id = env.ROOM.idFromName("root");
      const stub = env.ROOM.get(id);
      return stub.fetch(request);
    }

    const headers = new Headers({
      "Access-Control-Allow-Origin": origin || "",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    });

    // OPTIONSリクエスト(プリフライト)の処理
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers });
    }

    return new Response("Plaza backend OK", { headers });
  }
};

export class RootRoom {
  users = new Map<string, WebSocket>();
  userPositions = new Map<string, { x: number; y: number }>();

  constructor(public state: DurableObjectState) {}

  async fetch(request: Request) {
    if (request.headers.get("Upgrade") !== "websocket") {
      return new Response("Expected websocket", { status: 426 });
    }

    const pair = new WebSocketPair();
    const client = pair[0];
    const server = pair[1];

    server.accept();

    const userId = crypto.randomUUID();
    
    // Set initial position
    const initialX = 400;
    const initialY = 300;
    
    this.users.set(userId, server);
    this.userPositions.set(userId, { x: initialX, y: initialY });
    
    const existingUsers = Array.from(this.users.keys())
      .filter(uid => uid !== userId)
      .map(uid => ({
        id: uid,
        x: this.userPositions.get(uid)?.x ?? 400,
        y: this.userPositions.get(uid)?.y ?? 300,
      }));
    
    server.send(JSON.stringify({
      type: "init",
      userId,
      x: initialX,
      y: initialY,
      users: existingUsers,
    }));

    // Broadcast join message to all other users with position
    this.broadcast({ type: "join", userId, x: initialX, y: initialY });

    server.addEventListener("message", (event: MessageEvent) => {
      const msg = JSON.parse(event.data as string);

      if (msg.type === "move") {
        this.userPositions.set(userId, { x: msg.x, y: msg.y });
      }

      this.broadcast({
        ...msg,
        userId,
      });
    });

    server.addEventListener("close", () => {
      this.users.delete(userId);
      this.userPositions.delete(userId);
      this.broadcast({ type: "leave", userId });
    });

    return new Response(null, { status: 101, webSocket: client as any });
  }

  broadcast(obj: any) {
    const msg = JSON.stringify(obj);
    for (const ws of this.users.values()) {
      try { ws.send(msg); } catch {}
    }
  }
}
