import { useEffect, useRef, useState } from "react";
import type { User, ServerMessage } from "@plaza/shared";
import "./Plaza.css";

interface PlazaProps {
  myUserId: string | null;
  subscribe: (listener: (msg: ServerMessage) => void) => () => void;
  onMove: (x: number, y: number) => void;
}

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const MOVE_SPEED = 5;
const AVATAR_SIZE = 30;

const COLORS = [
  "#FF6B6B", "#4ECDC4", "#45B7D1", "#FFA07A", "#98D8C8",
  "#F7DC6F", "#BB8FCE", "#85C1E2", "#F8B195", "#C06C84"
];

function getUserColor(userId: string): string {
  const hash = userId.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return COLORS[hash % COLORS.length];
}

export function Plaza({ myUserId, subscribe, onMove }: PlazaProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [users, setUsers] = useState<Map<string, User>>(new Map());
  const [myPosition, setMyPosition] = useState({ x: 400, y: 300 });
  const keysPressed = useRef<Set<string>>(new Set());

  useEffect(() => {
    const unsubscribe = subscribe((msg) => {
      if (msg.type === "init") {
        // Initialize other users at random positions
        const newUsers = new Map<string, User>();
        msg.users.forEach((userId) => {
          if (userId !== msg.userId) {
            newUsers.set(userId, {
              id: userId,
              x: Math.random() * (CANVAS_WIDTH - AVATAR_SIZE),
              y: Math.random() * (CANVAS_HEIGHT - AVATAR_SIZE),
              name: `User ${userId.slice(0, 4)}`,
            });
          }
        });
        setUsers(newUsers);
      } else if (msg.type === "join") {
        setUsers((prev) => {
          const next = new Map(prev);
          if (msg.userId !== myUserId) {
            next.set(msg.userId, {
              id: msg.userId,
              x: Math.random() * (CANVAS_WIDTH - AVATAR_SIZE),
              y: Math.random() * (CANVAS_HEIGHT - AVATAR_SIZE),
              name: `User ${msg.userId.slice(0, 4)}`,
            });
          }
          return next;
        });
      } else if (msg.type === "leave") {
        setUsers((prev) => {
          const next = new Map(prev);
          next.delete(msg.userId);
          return next;
        });
      } else if (msg.type === "move") {
        setUsers((prev) => {
          const next = new Map(prev);
          const user = next.get(msg.userId);
          if (user) {
            next.set(msg.userId, { ...user, x: msg.x, y: msg.y });
          }
          return next;
        });
      }
    });

    return unsubscribe;
  }, [subscribe, myUserId]);

  // Keyboard movement
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(key)) {
        e.preventDefault();
        keysPressed.current.add(key);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      keysPressed.current.delete(key);
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  // Game loop
  useEffect(() => {
    const interval = setInterval(() => {
      let dx = 0;
      let dy = 0;

      if (keysPressed.current.has("w") || keysPressed.current.has("arrowup")) dy -= MOVE_SPEED;
      if (keysPressed.current.has("s") || keysPressed.current.has("arrowdown")) dy += MOVE_SPEED;
      if (keysPressed.current.has("a") || keysPressed.current.has("arrowleft")) dx -= MOVE_SPEED;
      if (keysPressed.current.has("d") || keysPressed.current.has("arrowright")) dx += MOVE_SPEED;

      if (dx !== 0 || dy !== 0) {
        setMyPosition((prev) => {
          const newX = Math.max(0, Math.min(CANVAS_WIDTH - AVATAR_SIZE, prev.x + dx));
          const newY = Math.max(0, Math.min(CANVAS_HEIGHT - AVATAR_SIZE, prev.y + dy));
          
          if (newX !== prev.x || newY !== prev.y) {
            onMove(newX, newY);
            return { x: newX, y: newY };
          }
          return prev;
        });
      }
    }, 1000 / 60); // 60 FPS

    return () => clearInterval(interval);
  }, [onMove]);

  // Render canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = "#f0f0f0";
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Draw grid
    ctx.strokeStyle = "#e0e0e0";
    ctx.lineWidth = 1;
    for (let x = 0; x < CANVAS_WIDTH; x += 50) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, CANVAS_HEIGHT);
      ctx.stroke();
    }
    for (let y = 0; y < CANVAS_HEIGHT; y += 50) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(CANVAS_WIDTH, y);
      ctx.stroke();
    }

    // Draw other users
    users.forEach((user) => {
      const color = getUserColor(user.id);
      
      // Avatar circle
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(user.x + AVATAR_SIZE / 2, user.y + AVATAR_SIZE / 2, AVATAR_SIZE / 2, 0, Math.PI * 2);
      ctx.fill();

      // Name label
      ctx.fillStyle = "#000";
      ctx.font = "12px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(user.name, user.x + AVATAR_SIZE / 2, user.y - 5);
    });

    // Draw my avatar
    if (myUserId) {
      const myColor = getUserColor(myUserId);
      ctx.fillStyle = myColor;
      ctx.beginPath();
      ctx.arc(myPosition.x + AVATAR_SIZE / 2, myPosition.y + AVATAR_SIZE / 2, AVATAR_SIZE / 2, 0, Math.PI * 2);
      ctx.fill();

      // Border for my avatar
      ctx.strokeStyle = "#000";
      ctx.lineWidth = 3;
      ctx.stroke();

      // My name
      ctx.fillStyle = "#000";
      ctx.font = "bold 12px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("You", myPosition.x + AVATAR_SIZE / 2, myPosition.y - 5);
    }
  }, [users, myPosition, myUserId]);

  return (
    <div className="plaza-wrapper">
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        className="plaza-canvas"
      />
      <p className="plaza-controls">
        Use WASD or Arrow keys to move around
      </p>
    </div>
  );
}
