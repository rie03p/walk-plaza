import { useWebSocket } from "./hooks/useWebSocket";
import { Plaza } from "./components/Plaza";
import "./App.css";

const WS_URL = import.meta.env.DEV
  ? "ws://localhost:8787/ws"
  : `wss://${window.location.host}/ws`;

function App() {
  const { isConnected, myUserId, send, subscribe } = useWebSocket(WS_URL);

  const handleMove = (x: number, y: number) => {
    send({ type: "move", x, y });
  };

  return (
    <div className="plaza-container">
      <div className="plaza-status">
        {isConnected ? (
          <span className="status-connected">● Connected</span>
        ) : (
          <span className="status-connecting">● Connecting...</span>
        )}
        {myUserId && (
          <span className="status-user-id">
            Your ID: {myUserId.slice(0, 8)}
          </span>
        )}
      </div>

      {isConnected && myUserId ? (
        <div className="plaza-main">
          <Plaza
            myUserId={myUserId}
            subscribe={subscribe}
            onMove={handleMove}
          />
        </div>
      ) : (
        <div className="plaza-loading">
          <p>Connecting to plaza...</p>
        </div>
      )}
    </div>
  );
}

export default App;

