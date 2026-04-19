import { memo, useEffect, useMemo, useRef, useState } from "react";
import {
  clearToken,
  getClaims,
  getDisplayName,
  getRole,
  getToken,
  saveToken,
} from "./lib/auth";
import { apiRequest, apiBaseUrl } from "./lib/api";
import type {
  AuthData,
  ChatMessage,
  HistoryResponse,
  IceServerResponse,
  Role,
  Room,
  SharedFile,
} from "./types";
import * as signalR from "@microsoft/signalr";

type View = "auth" | "lobby" | "room";

function App() {
  const [token, setToken] = useState<string | null>(getToken());
  const [role, setRole] = useState<Role>(getRole(token));
  const [room, setRoom] = useState<Room | null>(null);
  const [view, setView] = useState<View>(token ? "lobby" : "auth");
  const [error, setError] = useState("");

  useEffect(() => {
    setRole(getRole(token));
  }, [token]);

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

  return (
    <div className="container">
      <header>
        <h1>NexMeet</h1>
        <p>Real-time chat and video rooms.</p>
        {token ? (
          <div className="session">
            <span>
              Logged in as {getDisplayName(token)} ({role})
            </span>
            <button onClick={logout}>Logout</button>
          </div>
        ) : null}
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

function AuthPanel({
  onAuth,
  onError,
}: {
  onAuth: (token: string) => void;
  onError: (e: string) => void;
}) {
  const [activeTab, setActiveTab] = useState<"login" | "register" | "guest">(
    "login",
  );
  const [guestName, setGuestName] = useState("");
  const [meetingCode, setMeetingCode] = useState("");

  async function login(formData: FormData) {
    onError("");
    const data = await apiRequest<AuthData>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({
        identifier: formData.get("identifier"),
        password: formData.get("password"),
      }),
    });
    onAuth(data.accessToken);
  }

  async function register(formData: FormData) {
    onError("");
    const data = await apiRequest<AuthData>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({
        login: formData.get("login"),
        password: formData.get("password"),
        email: formData.get("email"),
        displayName: formData.get("displayName"),
      }),
    });
    onAuth(data.accessToken);
  }

  const guestJoin = async () => {
    onError("");
    const data = await apiRequest<{ accessToken: string }>("/api/auth/guest", {
      method: "POST",
      body: JSON.stringify({ guestName, meetingCode }),
    });
    onAuth(data.accessToken);
  };

  return (
    <section style={{ maxWidth: "500px", margin: "0 auto" }}>
      <div className="tabs">
        <button
          className={`tab-button ${activeTab === "login" ? "active" : ""}`}
          onClick={() => setActiveTab("login")}
        >
          Login
        </button>
        <button
          className={`tab-button ${activeTab === "register" ? "active" : ""}`}
          onClick={() => setActiveTab("register")}
        >
          Register
        </button>
        <button
          className={`tab-button ${activeTab === "guest" ? "active" : ""}`}
          onClick={() => setActiveTab("guest")}
        >
          Guest
        </button>
      </div>

      {activeTab === "login" && (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            try {
              await login(new FormData(e.currentTarget));
            } catch (error) {
              onError((error as Error).message);
            }
          }}
        >
          <h3>Sign In</h3>
          <input
            required
            name="identifier"
            placeholder="Username or email"
            autoFocus
          />
          <input
            required
            type="password"
            name="password"
            placeholder="Password"
            autoComplete="current-password"
          />
          <button type="submit">Sign In</button>
          <p style={{ textAlign: "center", color: "var(--text-muted)" }}>
            Don't have an account?{" "}
            <button
              type="button"
              className="secondary"
              style={{
                background: "none",
                border: "none",
                color: "var(--primary-light)",
                padding: "0",
                cursor: "pointer",
              }}
              onClick={() => setActiveTab("register")}
            >
              Register
            </button>
          </p>
        </form>
      )}

      {activeTab === "register" && (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            try {
              await register(new FormData(e.currentTarget));
            } catch (error) {
              onError((error as Error).message);
            }
          }}
        >
          <h3>Create Account</h3>
          <input
            required
            name="username"
            placeholder="Username"
            autoComplete="username"
            autoFocus
          />
          <input
            required
            name="email"
            type="email"
            placeholder="Email"
            autoComplete="email"
          />
          <input
            required
            name="displayName"
            placeholder="Display name"
            autoComplete="name"
          />
          <input
            required
            type="password"
            name="password"
            placeholder="Password"
            autoComplete="new-password"
          />
          <button type="submit">Create Account</button>
          <p style={{ textAlign: "center", color: "var(--text-muted)" }}>
            Already have an account?{" "}
            <button
              type="button"
              className="secondary"
              style={{
                background: "none",
                border: "none",
                color: "var(--primary-light)",
                padding: "0",
                cursor: "pointer",
              }}
              onClick={() => setActiveTab("login")}
            >
              Sign In
            </button>
          </p>
        </form>
      )}

      {activeTab === "guest" && (
        <div className="card">
          <h3>Join as Guest</h3>
          <p style={{ color: "var(--text-muted)", margin: "0 0 1rem 0" }}>
            Enter your name and the meeting code to join a room
          </p>
          <input
            value={guestName}
            onChange={(e) => setGuestName(e.target.value)}
            placeholder="Your name"
            autoFocus
          />
          <input
            value={meetingCode}
            onChange={(e) => setMeetingCode(e.target.value)}
            placeholder="Meeting code (e.g., abc-defg-hij)"
          />
          <button
            onClick={async () => {
              try {
                await guestJoin();
              } catch (error) {
                onError((error as Error).message);
              }
            }}
          >
            Join Meeting
          </button>
        </div>
      )}
    </section>
  );
}

function Lobby({
  token,
  role,
  onEnterRoom,
  onError,
}: {
  token: string;
  role: Role;
  onEnterRoom: (room: Room) => void;
  onError: (e: string) => void;
}) {
  const [roomName, setRoomName] = useState("");
  const [roomCode, setRoomCode] = useState(
    getClaims(token)?.meeting_code ?? "",
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
              onClick={async () => {
                try {
                  const room = await apiRequest<Room>("/api/rooms", {
                    method: "POST",
                    body: JSON.stringify({ name: roomName }),
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
            onClick={async () => {
              try {
                await joinByCode(roomCode);
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

function RoomPage({
  token,
  role,
  room,
  onLeave,
  onError,
}: {
  token: string;
  role: Role;
  room: Room;
  onLeave: () => void;
  onError: (e: string) => void;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [files, setFiles] = useState<SharedFile[]>([]);
  const [text, setText] = useState("");
  const [typing, setTyping] = useState("");
  const [chatConnection, setChatConnection] =
    useState<signalR.HubConnection | null>(null);
  const [callConnection, setCallConnection] =
    useState<signalR.HubConnection | null>(null);
  const [micEnabled, setMicEnabled] = useState(true);
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const currentUserDisplayName = getDisplayName(token);
  const [peerDisplayNames, setPeerDisplayNames] = useState<Map<string, string>>(
    new Map(),
  );

  const typingTimeoutRef = useRef<number | null>(null);
  const remoteTypingTimeoutRef = useRef<number | null>(null);
  const localMediaRef = useRef<MediaStream | null>(null);
  const peersRef = useRef(new Map<string, RTCPeerConnection>());

  const peers = peersRef.current;
  const [videos, setVideos] = useState<
    Array<{ id: string; stream: MediaStream }>
  >([]);

  const toggleMicrophone = () => {
    const audio = localMediaRef.current?.getAudioTracks();
    if (audio) {
      const newState = !micEnabled;
      audio.forEach((track) => {
        track.enabled = newState;
      });
      setMicEnabled(newState);
    }
  };

  const toggleCamera = () => {
    const video = localMediaRef.current?.getVideoTracks();
    if (video) {
      const newState = !cameraEnabled;
      video.forEach((track) => {
        track.enabled = newState;
      });
      setCameraEnabled(newState);
    }
  };

  useEffect(() => {
    let mounted = true;
    let localChatHub: signalR.HubConnection | null = null;
    let localSignalingHub: signalR.HubConnection | null = null;

    const initialize = async () => {
      try {
        if (role === "Member") {
          const history = await apiRequest<HistoryResponse>(
            `/api/history/${room.id}?limit=50`,
          );
          if (mounted) {
            setMessages(history.messages);
            setFiles(history.files);
            // Build peer display names from historical messages
            const displayNameMap = new Map<string, string>();
            history.messages.forEach((msg) => {
              if (msg.senderDisplayName) {
                displayNameMap.set(msg.senderUserId, msg.senderDisplayName);
              }
            });
            setPeerDisplayNames(displayNameMap);
          }
        } else {
          const roomFiles = await apiRequest<SharedFile[]>(
            `/api/files/room/${room.id}`,
          );
          if (mounted) {
            setMessages([]);
            setFiles(roomFiles);
          }
        }
      } catch (error) {
        onError((error as Error).message);
        return;
      }

      const chatHub = new signalR.HubConnectionBuilder()
        .withUrl(`${apiBaseUrl()}/hubs/chat?access_token=${token}`)
        .withAutomaticReconnect()
        .build();

      chatHub.on("ReceiveMessage", (message: ChatMessage) => {
        if (!mounted) return;
        setMessages((prev) => [...prev, message]);
        // Track display names from messages to match with video peers
        const claims = getClaims(token);
        const currentUserId = claims?.sub || claims?.nameid;
        if (message.senderUserId !== currentUserId) {
          setPeerDisplayNames((prev) => {
            const updated = new Map(prev);
            // Store the display name for this user ID
            updated.set(message.senderUserId, message.senderDisplayName);
            return updated;
          });
        }
      });

      chatHub.on("UserTyping", (displayName: string, isTyping: boolean) => {
        if (!mounted) return;

        if (remoteTypingTimeoutRef.current) {
          window.clearTimeout(remoteTypingTimeoutRef.current);
        }

        if (!isTyping) {
          setTyping("");
          return;
        }

        setTyping(`${displayName} is typing...`);
        remoteTypingTimeoutRef.current = window.setTimeout(() => {
          setTyping("");
        }, 1200);
      });

      try {
        await chatHub.start();
      } catch (err) {
        onError("Failed to connect to chat: " + (err as Error).message);
        return;
      }

      try {
        await chatHub.invoke("JoinRoom", room.code);
      } catch (err) {
        chatHub.stop().catch(() => null);
        onError("Failed to join room: " + (err as Error).message);
        return;
      }

      if (mounted) {
        setChatConnection(chatHub);
      }
      localChatHub = chatHub;

      let localMedia: MediaStream | null = null;
      try {
        localMedia = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
      } catch (err) {
        onError(
          "Failed to access camera/microphone: " + (err as Error).message,
        );
        return;
      }

      localMediaRef.current = localMedia;

      if (mounted) {
        setVideos([{ id: "self", stream: localMedia }]);
      }

      const iceConfig = await apiRequest<IceServerResponse>(
        "/api/signaling/ice-servers",
      );

      const signalingHub = new signalR.HubConnectionBuilder()
        .withUrl(`${apiBaseUrl()}/hubs/signaling?access_token=${token}`)
        .withAutomaticReconnect()
        .build();

      const createPeer = (id: string) => {
        // Don't create duplicate peer connections
        if (peers.has(id)) {
          return peers.get(id)!;
        }

        const pc = new RTCPeerConnection({ iceServers: iceConfig.iceServers });

        localMediaRef.current?.getTracks().forEach((track) => {
          if (localMediaRef.current) {
            pc.addTrack(track, localMediaRef.current);
          }
        });

        pc.onicecandidate = (event) => {
          if (event.candidate) {
            signalingHub.invoke("SendIceCandidate", id, event.candidate);
          }
        };

        pc.ontrack = (event) => {
          if (!mounted) return;
          setVideos((prev) => {
            if (prev.some((v) => v.id === id)) return prev;
            return [...prev, { id, stream: event.streams[0] }];
          });
        };

        peers.set(id, pc);
        return pc;
      };

      signalingHub.on("PeerJoined", async (peerId: string) => {
        const pc = createPeer(peerId);
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        await signalingHub.invoke("SendOffer", peerId, offer);
      });

      signalingHub.on(
        "ReceiveOffer",
        async (peerId: string, offer: RTCSessionDescriptionInit) => {
          const pc = createPeer(peerId);
          await pc.setRemoteDescription(offer);
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          await signalingHub.invoke("SendAnswer", peerId, answer);
        },
      );

      signalingHub.on(
        "ReceiveAnswer",
        async (peerId: string, answer: RTCSessionDescriptionInit) => {
          const pc = peers.get(peerId);
          if (pc) await pc.setRemoteDescription(answer);
        },
      );

      signalingHub.on(
        "ReceiveIceCandidate",
        async (peerId: string, candidate: RTCIceCandidateInit) => {
          const pc = peers.get(peerId);
          if (pc) await pc.addIceCandidate(candidate);
        },
      );

      signalingHub.on("PeerLeft", (peerId: string) => {
        if (!mounted) return;
        const pc = peers.get(peerId);
        if (pc) {
          pc.close();
          peers.delete(peerId);
        }
        // Remove the video stream for this peer
        setVideos((prev) => prev.filter((v) => v.id !== peerId));
      });

      try {
        await signalingHub.start();
      } catch (err) {
        localChatHub?.stop().catch(() => null);
        onError("Failed to connect to signaling: " + (err as Error).message);
        return;
      }

      try {
        await signalingHub.invoke("JoinMeeting", room.code);
      } catch (err) {
        signalingHub.stop().catch(() => null);
        localChatHub?.stop().catch(() => null);
        onError("Failed to join meeting: " + (err as Error).message);
        return;
      }

      if (mounted) {
        setCallConnection(signalingHub);
      }
      localSignalingHub = signalingHub;
    };

    initialize().catch((err) => onError((err as Error).message));

    return () => {
      mounted = false;

      if (typingTimeoutRef.current) {
        window.clearTimeout(typingTimeoutRef.current);
      }

      if (remoteTypingTimeoutRef.current) {
        window.clearTimeout(remoteTypingTimeoutRef.current);
      }

      // Properly clean up signaling and chat connections
      localSignalingHub?.invoke("LeaveMeeting", room.code).catch(() => null);
      localSignalingHub?.stop().catch(() => null);

      localChatHub?.invoke("LeaveRoom", room.code).catch(() => null);
      localChatHub?.stop().catch(() => null);

      // Close all peer connections
      peers.forEach((pc) => pc.close());
      peers.clear();

      // Stop all local media tracks
      localMediaRef.current?.getTracks().forEach((track) => track.stop());
      localMediaRef.current = null;

      // Clear videos state
      setVideos([]);
    };
  }, [room.id, room.code, role, token, onError, peers]);

  return (
    <section>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "1.5rem",
          paddingBottom: "1rem",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <div>
          <h2 style={{ margin: "0 0 0.5rem 0" }}>🎥 {room.name}</h2>
          <p
            style={{
              color: "var(--text-muted)",
              margin: "0",
              fontSize: "0.9rem",
            }}
          >
            Code:{" "}
            <code
              style={{
                background: "var(--bg-tertiary)",
                padding: "0.25rem 0.5rem",
                borderRadius: "0.4rem",
              }}
            >
              {room.code}
            </code>
          </p>
        </div>
        <button className="secondary" onClick={onLeave}>
          ← Leave Room
        </button>
      </div>

      {/* Video Panel */}
      <VideoPanel
        videos={videos}
        micEnabled={micEnabled}
        cameraEnabled={cameraEnabled}
        onToggleMicrophone={toggleMicrophone}
        onToggleCamera={toggleCamera}
        peerDisplayNames={peerDisplayNames}
      />

      {/* Main Content: Chat and Files */}
      <div className="grid-2" style={{ marginTop: "2rem" }}>
        {/* Chat Section */}
        <div
          className="card"
          style={{ display: "flex", flexDirection: "column" }}
        >
          <h3 style={{ marginTop: "0" }}>💬 Chat</h3>
          <div className="messages" style={{ flex: 1, minHeight: "300px" }}>
            {messages.length === 0 ? (
              <p
                style={{
                  color: "var(--text-muted)",
                  textAlign: "center",
                  padding: "2rem 1rem",
                  margin: "0",
                }}
              >
                No messages yet. Start the conversation!
              </p>
            ) : (
              messages.map((m) => {
                const isCurrentUser =
                  m.senderDisplayName === currentUserDisplayName;
                return (
                  <div
                    key={m.id}
                    style={{
                      display: "flex",
                      justifyContent: isCurrentUser ? "flex-end" : "flex-start",
                      marginBottom: "0.75rem",
                    }}
                  >
                    <div
                      style={{
                        maxWidth: "70%",
                        padding: "0.75rem 1rem",
                        borderRadius: "0.75rem",
                        background: isCurrentUser
                          ? "var(--primary)"
                          : "var(--bg-tertiary)",
                        color: isCurrentUser ? "white" : "var(--text-primary)",
                      }}
                    >
                      {!isCurrentUser && (
                        <strong
                          style={{
                            color: isCurrentUser
                              ? "white"
                              : "var(--primary-light)",
                            display: "block",
                            marginBottom: "0.25rem",
                          }}
                        >
                          {m.senderDisplayName || "Unknown"}
                        </strong>
                      )}
                      <p
                        style={{
                          margin: "0",
                          color: isCurrentUser
                            ? "white"
                            : "var(--text-primary)",
                          wordBreak: "break-word",
                        }}
                      >
                        {m.text}
                      </p>
                      <small
                        style={{
                          color: isCurrentUser
                            ? "rgba(255, 255, 255, 0.7)"
                            : "var(--text-muted)",
                          fontSize: "0.75rem",
                          marginTop: "0.25rem",
                          display: "block",
                        }}
                      >
                        {new Date(m.createdAt).toLocaleTimeString()}
                      </small>
                    </div>
                  </div>
                );
              })
            )}
            {typing && (
              <p
                style={{
                  color: "var(--text-muted)",
                  fontStyle: "italic",
                  margin: "0.5rem 0 0 0",
                }}
              >
                ✏️ {typing}
              </p>
            )}
          </div>

          <div style={{ display: "flex", gap: "0.75rem", marginTop: "1rem" }}>
            <input
              value={text}
              onChange={(e) => {
                const value = e.target.value;
                setText(value);

                chatConnection
                  ?.invoke("SendTypingStatus", room.code, value.length > 0)
                  .catch(() => null);

                if (typingTimeoutRef.current) {
                  window.clearTimeout(typingTimeoutRef.current);
                }

                typingTimeoutRef.current = window.setTimeout(() => {
                  chatConnection
                    ?.invoke("SendTypingStatus", room.code, false)
                    .catch(() => null);
                }, 1000);
              }}
              placeholder="Type a message..."
              style={{ flex: 1 }}
            />
            <button
              onClick={async () => {
                if (!text.trim()) return;

                await chatConnection?.invoke("SendMessage", room.code, text);
                await chatConnection
                  ?.invoke("SendTypingStatus", room.code, false)
                  .catch(() => null);

                if (typingTimeoutRef.current) {
                  window.clearTimeout(typingTimeoutRef.current);
                }

                setText("");
              }}
              style={{ minWidth: "100px" }}
            >
              Send
            </button>
          </div>
        </div>

        {/* Files Section */}
        <div
          className="card"
          style={{ display: "flex", flexDirection: "column" }}
        >
          <h3 style={{ marginTop: "0" }}>📁 Files</h3>
          {role === "Member" && (
            <label
              style={{
                display: "block",
                padding: "1rem",
                border: "2px dashed var(--border)",
                borderRadius: "0.75rem",
                textAlign: "center",
                cursor: "pointer",
                transition: "all 0.3s ease",
                marginBottom: "1rem",
              }}
              onDragOver={(e) => {
                e.preventDefault();
                e.currentTarget.style.borderColor = "var(--primary)";
                e.currentTarget.style.backgroundColor =
                  "rgba(59, 130, 246, 0.1)";
              }}
              onDragLeave={(e) => {
                e.currentTarget.style.borderColor = "var(--border)";
                e.currentTarget.style.backgroundColor = "transparent";
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.currentTarget.style.borderColor = "var(--border)";
                e.currentTarget.style.backgroundColor = "transparent";
              }}
            >
              <input
                type="file"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;

                  const formData = new FormData();
                  formData.append("file", file);

                  try {
                    const uploaded = await apiRequest<SharedFile>(
                      `/api/files/upload/${room.id}`,
                      { method: "POST", body: formData },
                    );
                    setFiles((prev) => [...prev, uploaded]);
                  } catch (error) {
                    onError((error as Error).message);
                  }
                }}
                style={{ display: "none" }}
                accept="*/*"
              />
              <div style={{ pointerEvents: "none" }}>
                <p
                  style={{
                    margin: "0 0 0.5rem 0",
                    color: "var(--text-primary)",
                    fontWeight: "600",
                  }}
                >
                  📤 Upload File
                </p>
                <p
                  style={{
                    margin: "0",
                    color: "var(--text-muted)",
                    fontSize: "0.9rem",
                  }}
                >
                  Drag and drop or click to select
                </p>
              </div>
            </label>
          )}

          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              gap: "0.75rem",
            }}
          >
            {files.length === 0 ? (
              <p
                style={{
                  color: "var(--text-muted)",
                  textAlign: "center",
                  padding: "2rem 1rem",
                  margin: "0",
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                No files shared yet
              </p>
            ) : (
              files.map((f) => (
                <div className="row" key={f.id}>
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: "0", fontWeight: "500" }}>
                      📄 {f.originalFileName}
                    </p>
                    <p
                      style={{
                        margin: "0.25rem 0 0 0",
                        fontSize: "0.85rem",
                        color: "var(--text-muted)",
                      }}
                    >
                      {Math.round(f.size / 1024)} KB
                    </p>
                  </div>
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <a
                      href={`${apiBaseUrl()}/api/files/download/${f.id}`}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        padding: "0.5rem 1rem",
                        background: "var(--primary)",
                        color: "white",
                        borderRadius: "0.5rem",
                        textDecoration: "none",
                        fontSize: "0.9rem",
                        fontWeight: "500",
                        transition: "all 0.3s ease",
                        cursor: "pointer",
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.background =
                          "var(--primary-dark)";
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.background = "var(--primary)";
                      }}
                    >
                      ⬇️ Download
                    </a>
                    {role === "Member" && (
                      <button
                        className="secondary"
                        style={{ padding: "0.5rem 1rem" }}
                        onClick={async () => {
                          try {
                            await apiRequest(`/api/files/delete/${f.id}`, {
                              method: "DELETE",
                            });
                            setFiles((prev) =>
                              prev.filter((x) => x.id !== f.id),
                            );
                          } catch (error) {
                            onError((error as Error).message);
                          }
                        }}
                      >
                        🗑️ Delete
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

const VideoPanel = memo(function VideoPanel({
  videos,
  micEnabled,
  cameraEnabled,
  onToggleMicrophone,
  onToggleCamera,
  peerDisplayNames,
}: {
  videos: Array<{ id: string; stream: MediaStream }>;
  micEnabled: boolean;
  cameraEnabled: boolean;
  onToggleMicrophone: () => void;
  onToggleCamera: () => void;
  peerDisplayNames: Map<string, string>;
}) {
  return (
    <div className="card" style={{ marginBottom: "0" }}>
      <h3 style={{ marginTop: "0" }}>🎥 Video Conference</h3>
      <div className="videos">
        {videos.length === 0 ? (
          <div
            style={{
              gridColumn: "1 / -1",
              height: "300px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "var(--bg-tertiary)",
              borderRadius: "1rem",
              color: "var(--text-muted)",
            }}
          >
            Loading camera...
          </div>
        ) : (
          videos.map((video) => (
            <Video
              key={video.id}
              stream={video.stream}
              muted={video.id === "self"}
              label={
                video.id === "self"
                  ? "You"
                  : peerDisplayNames.get(video.id) || "Participant"
              }
            />
          ))
        )}
      </div>
      <div className="controls">
        <button
          onClick={onToggleMicrophone}
          style={{
            background: micEnabled ? "var(--success)" : "var(--danger)",
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.transform = "scale(1.05)";
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.transform = "scale(1)";
          }}
        >
          {micEnabled ? "🎤 Mute" : "🔇 Unmute"}
        </button>
        <button
          onClick={onToggleCamera}
          style={{
            background: cameraEnabled ? "var(--success)" : "var(--danger)",
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.transform = "scale(1.05)";
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.transform = "scale(1)";
          }}
        >
          {cameraEnabled ? "📹 Camera On" : "📷 Camera Off"}
        </button>
      </div>
    </div>
  );
});

const Video = memo(function Video({
  stream,
  muted,
  label,
}: {
  stream: MediaStream;
  muted: boolean;
  label?: string;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (videoRef.current && videoRef.current.srcObject !== stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div style={{ position: "relative" }}>
      <video ref={videoRef} autoPlay playsInline muted={muted} />
      {label && (
        <div
          style={{
            position: "absolute",
            bottom: "1rem",
            left: "1rem",
            background: "rgba(0, 0, 0, 0.7)",
            color: "white",
            padding: "0.5rem 1rem",
            borderRadius: "0.5rem",
            fontSize: "0.9rem",
            fontWeight: "600",
          }}
        >
          {label}
        </div>
      )}
    </div>
  );
});

export default App;
