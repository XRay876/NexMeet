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
        <h1>NexMeet Frontend</h1>
        <p>Role-aware room chat, files, history, and WebRTC calling.</p>
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
    <section className="grid-2">
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
        <h3>Member Login</h3>
        <input required name="identifier" placeholder="Username or email" />
        <input
          required
          type="password"
          name="password"
          placeholder="Password"
          autoComplete="current-password"
        />
        <button type="submit">Login</button>
      </form>

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
        <h3>Member Register</h3>
        <input
          required
          name="username"
          placeholder="Username"
          autoComplete="username"
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
        <button type="submit">Register</button>
      </form>

      <div className="card">
        <h3>Guest Access</h3>
        <input
          value={guestName}
          onChange={(e) => setGuestName(e.target.value)}
          placeholder="Guest name"
        />
        <input
          value={meetingCode}
          onChange={(e) => setMeetingCode(e.target.value)}
          placeholder="Meeting code (abc-defg-hij)"
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
          Get Guest Token
        </button>
      </div>
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

  return (
    <section>
      <h2>Lobby</h2>

      {role === "Member" && (
        <div className="card">
          <h3>Create room (Member only)</h3>
          <input
            value={roomName}
            onChange={(e) => setRoomName(e.target.value)}
            placeholder="Room name"
          />
          <button
            onClick={async () => {
              try {
                const room = await apiRequest<Room>("/api/rooms", {
                  method: "POST",
                  body: JSON.stringify({ name: roomName }),
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
        <h3>Join room</h3>
        <input
          value={roomCode}
          onChange={(e) => setRoomCode(e.target.value)}
          placeholder="Room code"
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
          Join
        </button>
      </div>

      {role === "Member" && (
        <div className="card">
          <h3>My room history</h3>
          {myHistory.map((item) => (
            <div key={`${item.code}-${item.joinedAt}`} className="row">
              <span>
                {item.name} ({item.code})
              </span>
              <button onClick={() => joinByCode(item.code)}>Rejoin</button>
            </div>
          ))}
          {!myHistory.length && <small>No history yet.</small>}
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
      <h2>Room: {room.name}</h2>
      <p>
        Room Code: <strong>{room.code}</strong> | Room Id:{" "}
        <code>{room.id}</code>
      </p>
      <button onClick={onLeave}>Back to lobby</button>

      <div className="grid-2">
        <VideoPanel
          videos={videos}
          micEnabled={micEnabled}
          cameraEnabled={cameraEnabled}
          onToggleMicrophone={toggleMicrophone}
          onToggleCamera={toggleCamera}
        />

        <div className="card">
          <h3>Chat</h3>
          <div className="messages">
            {messages.map((m) => (
              <div key={m.id}>
                <strong>{m.senderDisplayName || "Unknown"}:</strong> {m.text}
              </div>
            ))}
          </div>

          <small>{typing}</small>

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
            placeholder="Type message"
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
          >
            Send
          </button>
        </div>
      </div>

      <div className="card">
        <h3>Files</h3>

        {role === "Member" && (
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
          />
        )}

        {files.map((f) => (
          <div className="row" key={f.id}>
            <span>
              {f.originalFileName} ({Math.round(f.size / 1024)} KB)
            </span>
            <div>
              <a
                href={`${apiBaseUrl()}/api/files/download/${f.id}`}
                target="_blank"
                rel="noreferrer"
              >
                Download
              </a>

              {role === "Member" && (
                <button
                  onClick={async () => {
                    try {
                      await apiRequest(`/api/files/delete/${f.id}`, {
                        method: "DELETE",
                      });
                      setFiles((prev) => prev.filter((x) => x.id !== f.id));
                    } catch (error) {
                      onError((error as Error).message);
                    }
                  }}
                >
                  Delete
                </button>
              )}
            </div>
          </div>
        ))}
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
}: {
  videos: Array<{ id: string; stream: MediaStream }>;
  micEnabled: boolean;
  cameraEnabled: boolean;
  onToggleMicrophone: () => void;
  onToggleCamera: () => void;
}) {
  return (
    <div className="card">
      <h3>WebRTC Call</h3>
      <div className="videos">
        {videos.map((video) => (
          <Video
            key={video.id}
            stream={video.stream}
            muted={video.id === "self"}
          />
        ))}
      </div>
      <div style={{ marginTop: "10px", display: "flex", gap: "10px" }}>
        <button onClick={onToggleMicrophone}>
          {micEnabled ? "🎤 Mute" : "🔇 Unmute"}
        </button>
        <button onClick={onToggleCamera}>
          {cameraEnabled ? "📹 Stop Camera" : "📷 Start Camera"}
        </button>
      </div>
    </div>
  );
});

const Video = memo(function Video({
  stream,
  muted,
}: {
  stream: MediaStream;
  muted: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (videoRef.current && videoRef.current.srcObject !== stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return <video ref={videoRef} autoPlay playsInline muted={muted} />;
});

export default App;
