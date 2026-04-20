import { useEffect, useState } from "react";
import {
  clearToken,
  getDisplayName,
  getRole,
  getToken,
  saveToken,
} from "./lib/auth";
import {
  applyTheme,
  getStoredTheme,
  toggleTheme,
  type Theme,
} from "./lib/theme";
import type { Role, Room } from "./types";
import { AuthPanel } from "./components/AuthPanel";
import { Lobby } from "./components/Lobby";
import { RoomPage } from "./components/RoomPage";

type View = "auth" | "lobby" | "room";

function App() {
  const [token, setToken] = useState<string | null>(getToken());
  const [role, setRole] = useState<Role>(getRole(token));
  const [room, setRoom] = useState<Room | null>(null);
  const [view, setView] = useState<View>(token ? "lobby" : "auth");
  const [error, setError] = useState("");
  const [theme, setTheme] = useState<Theme>(getStoredTheme());

  useEffect(() => {
    setRole(getRole(token));
  }, [token]);

  // Initialize theme on mount
  useEffect(() => {
    applyTheme(theme);
  }, []);

  const onAuthenticated = (newToken: string) => {
    saveToken(newToken);
    setToken(newToken);
    setView("lobby");
  };

  const logout = () => {
    clearToken();
    setToken(null);
    setRoom(null);
    setView("auth");
    setError("");
  };

  const handleThemeToggle = () => {
    const newTheme = toggleTheme();
    setTheme(newTheme);
  };

  return (
    <div className="container">
      <header>
        <h1>NexMeet</h1>
        <p>Real-time chat and video rooms</p>
        <div className="session">
          <button
            className="theme-toggle"
            onClick={handleThemeToggle}
            title={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
            aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
          >
            {theme === "light" ? "🌙" : "☀️"}
          </button>
          {token ? (
            <>
              <span>
                Logged in as {getDisplayName(token)} ({role})
              </span>
              <button onClick={logout}>Logout</button>
            </>
          ) : null}
        </div>
      </header>

      {!!error && <p className="error">{error}</p>}

      {view === "auth" && (
        <AuthPanel onAuth={onAuthenticated} onError={setError} />
      )}

      {view === "lobby" && token && (
        <Lobby
          token={token}
          role={role}
          onEnterRoom={(r) => {
            setRoom(r);
            setView("room");
          }}
          onError={setError}
        />
      )}

      {view === "room" && token && room && (
        <RoomPage
          token={token}
          role={role}
          room={room}
          onLeave={() => {
            setRoom(null);
            setView("lobby");
          }}
          onError={setError}
        />
      )}
    </div>
  );
}

export default App;
