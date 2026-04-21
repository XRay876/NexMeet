import { useEffect, useState } from "react";
import { apiRequest } from "../lib/api";
import { getClaims } from "../lib/auth";
import type { Role, Room } from "../types";

export function Lobby({
  token,
  role,
  initialRoomCode,
  onEnterRoom,
  onError,
}: {
  token: string;
  role: Role;
  initialRoomCode?: string | null;
  onEnterRoom: (room: Room) => void;
  onError: (e: string) => void;
}) {
  const [roomName, setRoomName] = useState("");
  const [roomCode, setRoomCode] = useState(
    getClaims(token)?.meeting_code ?? initialRoomCode ?? "",
  );
  const [myHistory, setMyHistory] = useState<
    Array<{ code: string; name: string; joinedAt: string; wasOwner: boolean }>
  >([]);
  const [isClearing, setIsClearing] = useState(false);

  useEffect(() => {
    if (role !== "Member") return;

    apiRequest<
      Array<{ code: string; name: string; joinedAt: string; wasOwner: boolean }>
    >("/api/rooms/my-history")
      .then(setMyHistory)
      .catch((err) => onError((err as Error).message));
  }, [role, onError]);

  // Auto-join when arriving via invite link
  useEffect(() => {
    if (!initialRoomCode) return;
    joinByCode(initialRoomCode).catch((err) => onError((err as Error).message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function joinByCode(code: string) {
    const roomData = await apiRequest<Room>(`/api/rooms/${code}`);
    await apiRequest(`/api/rooms/${code}/join`, { method: "POST" });
    onEnterRoom(roomData);
  }

  async function clearHistory() {
    if (
      !confirm(
        "Are you sure you want to clear your room history? This cannot be undone.",
      )
    ) {
      return;
    }

    try {
      setIsClearing(true);
      await apiRequest("/api/rooms/clear-history", { method: "DELETE" });
      setMyHistory([]);
    } catch (error) {
      onError((error as Error).message);
    } finally {
      setIsClearing(false);
    }
  }

  return (
    <section>
      <h2>Welcome to NexMeet</h2>
      <p style={{ color: "var(--text-muted)", marginBottom: "2rem" }}>
        {role === "Member"
          ? "Create a new room or join an existing one"
          : "Join a room using the code below"}
      </p>

      <div className="grid-2">
        {role === "Member" && (
          <div className="card">
            <h3>📝 Create Room</h3>
            <p style={{ color: "var(--text-muted)", margin: "0 0 1rem 0" }}>
              Start a new meeting and invite others
            </p>
            <input
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              placeholder="Give your room a name"
            />
            <button
              disabled={!roomName.trim()}
              onClick={async () => {
                if (!roomName.trim()) {
                  onError("Please enter a room name.");
                  return;
                }
                try {
                  const room = await apiRequest<Room>("/api/rooms", {
                    method: "POST",
                    body: JSON.stringify({ name: roomName.trim() }),
                  });
                  // Join the room to record in history
                  await apiRequest(`/api/rooms/${room.code}/join`, {
                    method: "POST",
                  });
                  onEnterRoom(room);
                } catch (error) {
                  onError((error as Error).message);
                }
              }}
            >
              Create & Enter
            </button>
          </div>
        )}

        <div className="card">
          <h3>🔗 Join Room</h3>
          <p style={{ color: "var(--text-muted)", margin: "0 0 1rem 0" }}>
            Enter a room code to join an existing meeting
          </p>
          <input
            value={roomCode}
            onChange={(e) => setRoomCode(e.target.value)}
            placeholder="Enter room code"
          />
          <button
            disabled={!roomCode.trim()}
            onClick={async () => {
              if (!roomCode.trim()) {
                onError("Please enter a room code.");
                return;
              }
              try {
                await joinByCode(roomCode.trim());
              } catch (error) {
                onError((error as Error).message);
              }
            }}
          >
            Join Meeting
          </button>
        </div>
      </div>

      {role === "Member" && myHistory.length > 0 && (
        <div className="card" style={{ marginTop: "2rem" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "1rem",
            }}
          >
            <div>
              <h3 style={{ margin: "0 0 0.5rem 0" }}>📋 Recent Rooms</h3>
              <p style={{ color: "var(--text-muted)", margin: "0" }}>
                Quickly rejoin your recent meetings
              </p>
            </div>
            <button
              className="secondary"
              onClick={clearHistory}
              disabled={isClearing}
              style={{
                minWidth: "140px",
                padding: "0.75rem 1rem",
              }}
            >
              {isClearing ? "Clearing..." : "🗑️ Clear History"}
            </button>
          </div>
          <div
            style={{
              display: "grid",
              gap: "0.75rem",
            }}
          >
            {myHistory.map((item) => (
              <div key={`${item.code}-${item.joinedAt}`} className="row">
                <div>
                  <strong>{item.name}</strong>
                  <p
                    style={{
                      fontSize: "0.85rem",
                      color: "var(--text-muted)",
                      margin: "0.25rem 0 0 0",
                    }}
                  >
                    {item.code}
                    {item.wasOwner && " • You owned this room"}
                  </p>
                </div>
                <button
                  className="secondary"
                  onClick={() => joinByCode(item.code)}
                >
                  Rejoin
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
