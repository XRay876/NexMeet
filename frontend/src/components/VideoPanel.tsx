import { memo, useEffect, useRef } from "react";
import type { MutableRefObject } from "react";

const VideoPanel = memo(function VideoPanel({
  videos,
  micEnabled,
  cameraEnabled,
  onToggleMicrophone,
  onToggleCamera,
  peerDisplayNames,
  peerToUserIdRef,
  hostPeerId,
}: {
  videos: Array<{ id: string; stream: MediaStream }>;
  micEnabled: boolean;
  cameraEnabled: boolean;
  onToggleMicrophone: () => void;
  onToggleCamera: () => void;
  peerDisplayNames: Map<string, string>;
  peerToUserIdRef: MutableRefObject<Map<string, string>>;
  hostPeerId: string | null;
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
          videos.map((video) => {
            let displayLabel = "Participant";
            if (video.id === "self") {
              displayLabel = "You";
            } else {
              // Look up display name from the mapping
              // Try peerId first (now direct from backend), then try userId mapping as fallback
              const displayFromPeerId = peerDisplayNames.get(video.id);
              if (displayFromPeerId) {
                displayLabel = displayFromPeerId;
                // Add [Host] label if this peer is the host
                if (video.id === hostPeerId) {
                  displayLabel += " [Host]";
                }
              } else {
                const userId = peerToUserIdRef.current.get(video.id);
                if (userId) {
                  displayLabel = peerDisplayNames.get(userId) || "Participant";
                  // Add [Host] label if this peer is the host
                  if (video.id === hostPeerId) {
                    displayLabel += " [Host]";
                  }
                }
              }
            }

            return (
              <div key={video.id} className="video-tile">
                <Video
                  stream={video.stream}
                  muted={video.id === "self"}
                  label={displayLabel}
                />
              </div>
            );
          })
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
      <video ref={videoRef} autoPlay playsInline muted={muted} style={{ width: "100%", height: "100%" }} />
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
            zIndex: 10,
          }}
        >
          {label}
        </div>
      )}
    </div>
  );
});

export { VideoPanel, Video };
