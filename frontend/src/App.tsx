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
import { ProfileModal } from "./components/ProfileModal";
import { RoomPage } from "./components/RoomPage";

type View = "auth" | "lobby" | "room";

function readRoomParam(): string | null {
  return new URLSearchParams(window.location.search).get("room");
}

function clearRoomParam() {
  const url = new URL(window.location.href);
  url.searchParams.delete("room");
  window.history.replaceState({}, "", url.toString());
}

function App() {
  const [token, setToken] = useState<string | null>(getToken());
  const [role, setRole] = useState<Role>(getRole(token));
  const [room, setRoom] = useState<Room | null>(null);
  const [view, setView] = useState<View>(token ? "lobby" : "auth");
  const [error, setError] = useState("");
  const [theme, setTheme] = useState<Theme>(getStoredTheme());
  const [profileOpen, setProfileOpen] = useState(false);
  // Room code from invite link (?room=abc-defg-hij)
  const [pendingCode, setPendingCode] = useState<string | null>(readRoomParam);

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
    // pendingCode is preserved so Lobby can auto-join
  };

  const onEnterRoom = (r: Room) => {
    setRoom(r);
    setView("room");
    setPendingCode(null);
    clearRoomParam();
  };

  const logout = () => {
    clearToken();
    setToken(null);
    setRoom(null);
    setView("auth");
    setError("");
    setPendingCode(null);
    clearRoomParam();
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
              {role === "Member" && (
                <button className="secondary" onClick={() => setProfileOpen(true)}>
                  Profile
                </button>
              )}
              <button onClick={logout}>Logout</button>
            </>
          ) : null}
        </div>
      </header>

      {!!error && <p className="error">{error}</p>}

      {view === "auth" && (
        <AuthPanel
          onAuth={onAuthenticated}
          onError={setError}
          pendingRoomCode={pendingCode}
        />
      )}

      {view === "lobby" && token && (
        <Lobby
          token={token}
          role={role}
          initialRoomCode={pendingCode}
          onEnterRoom={onEnterRoom}
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

      {profileOpen && (
        <ProfileModal onClose={() => setProfileOpen(false)} />
      )}
    </div>
  );
}

export default App;
