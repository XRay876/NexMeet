import { useEffect, useRef, useState } from "react";
import * as signalR from "@microsoft/signalr";
import { apiRequest, apiBaseUrl } from "../lib/api";
import { getClaims, getDisplayName } from "../lib/auth";
import type {
  ChatMessage,
  HistoryResponse,
  IceServerResponse,
  Room,
  SharedFile,
  Role,
} from "../types";
import { VideoPanel } from "./VideoPanel";

export function RoomPage({
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
  const [hostPeerId, setHostPeerId] = useState<string | null>(null);

  const typingTimeoutRef = useRef<number | null>(null);
  const remoteTypingTimeoutRef = useRef<number | null>(null);
  const localMediaRef = useRef<MediaStream | null>(null);
  const peersRef = useRef(new Map<string, RTCPeerConnection>());
  // Map peerId to userId for display name lookup
  const peerToUserIdRef = useRef(new Map<string, string>());
  const fileInputRef = useRef<HTMLInputElement | null>(null);

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

            // Try to map this userId to a peerId if not already mapped
            const peerToUserId = peerToUserIdRef.current;
            const isUserAlreadyMapped = Array.from(
              peerToUserId.values(),
            ).includes(message.senderUserId);
            if (!isUserAlreadyMapped) {
              // Find an unmapped peer and assign this userId to it
              for (const peerId of peers.keys()) {
                if (!peerToUserId.has(peerId)) {
                  peerToUserId.set(peerId, message.senderUserId);
                  break;
                }
              }
            }

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

      chatHub.on("FileUploaded", (file: SharedFile) => {
        if (!mounted) return;
        setFiles((prev) => [...prev, file]);
      });

      chatHub.on("FileDeleted", (fileId: string) => {
        if (!mounted) return;
        setFiles((prev) => prev.filter((f) => f.id !== fileId));
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
        if (peers.has(id)) return peers.get(id)!;

        const pc = new RTCPeerConnection({ iceServers: iceConfig.iceServers });

        localMediaRef.current?.getTracks().forEach((track: MediaStreamTrack) => {
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
            if (prev.some((v: { id: string }) => v.id === id)) return prev;
            return [...prev, { id, stream: event.streams[0] }];
          });
        };

        peers.set(id, pc);
        return pc;
      };

      signalingHub.on(
        "PeerJoined",
        async (peerId: string, displayName: string, isHost: boolean) => {
          setPeerDisplayNames((prev) => {
            const updated = new Map(prev);
            updated.set(peerId, displayName);
            return updated;
          });
          if (isHost) setHostPeerId(peerId);

          const pc = createPeer(peerId);
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          await signalingHub.invoke("SendOffer", peerId, offer);
        },
      );

      // Receive info about existing peers (display names only, no offer)
      signalingHub.on(
        "PeerInfo",
        (peerId: string, displayName: string, isHost: boolean) => {
          setPeerDisplayNames((prev: Map<string, string>) => {
            const updated = new Map(prev);
            updated.set(peerId, displayName);
            return updated;
          });
          if (isHost) setHostPeerId(peerId);
        },
      );

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
        setVideos((prev) => prev.filter((v) => v.id !== peerId));
        if (peerId === hostPeerId) setHostPeerId(null);
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

      // Clear videos state and reset host
      setVideos([]);
      setHostPeerId(null);
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
        peerToUserIdRef={peerToUserIdRef}
        hostPeerId={hostPeerId}
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
                ref={fileInputRef}
                type="file"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;

                  const formData = new FormData();
                  formData.append("file", file);

                  try {
                    await apiRequest<SharedFile>(
                      `/api/files/upload/${room.id}?roomCode=${room.code}`,
                      { method: "POST", body: formData },
                    );
                    // File will be added via SignalR broadcast (FileUploaded event)
                    // Reset the file input so the same file can be selected again
                    if (fileInputRef.current) {
                      fileInputRef.current.value = "";
                    }
                  } catch (error) {
                    onError((error as Error).message);
                    // Reset input on error too
                    if (fileInputRef.current) {
                      fileInputRef.current.value = "";
                    }
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
                    <button
                      style={{
                        padding: "0.5rem 1rem",
                        background: "var(--primary)",
                        color: "white",
                        border: "none",
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
                      onClick={async () => {
                        try {
                          const response = await fetch(
                            `${apiBaseUrl()}/api/files/download/${f.id}`,
                            {
                              headers: {
                                Authorization: `Bearer ${token}`,
                              },
                            },
                          );

                          if (!response.ok) {
                            throw new Error("Download failed");
                          }

                          const blob = await response.blob();
                          const url = window.URL.createObjectURL(blob);
                          const link = document.createElement("a");
                          link.href = url;
                          link.download = f.originalFileName;
                          document.body.appendChild(link);
                          link.click();
                          document.body.removeChild(link);
                          window.URL.revokeObjectURL(url);
                        } catch (error) {
                          onError(
                            `Download failed: ${(error as Error).message}`,
                          );
                        }
                      }}
                    >
                      ⬇️ Download
                    </button>
                    {role === "Member" && (
                      <button
                        className="secondary"
                        style={{ padding: "0.5rem 1rem" }}
                        onClick={async () => {
                          try {
                            await apiRequest(
                              `/api/files/delete/${f.id}?roomCode=${room.code}`,
                              {
                                method: "DELETE",
                              },
                            );
                            // File will be removed via SignalR broadcast (FileDeleted event)
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
