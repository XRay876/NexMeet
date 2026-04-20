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
  const assignedStreamIdRef = useRef<string | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !stream) return;

    // Track which stream we've already assigned to prevent re-assignment
    if (assignedStreamIdRef.current === stream.id) {
      console.log(`[Video] Stream ${stream.id} already assigned, skipping`);
      return;
    }

    const videoTracks = stream.getVideoTracks();
    const audioTracks = stream.getAudioTracks();
    console.log(
      `[Video] Stream ${stream.id} received: ${videoTracks.length} video(s), ${audioTracks.length} audio(s)`,
    );
    
    // Log track details
    videoTracks.forEach((track, idx) => {
      console.log(`  [Video] Video track ${idx}: enabled=${track.enabled}, state=${track.readyState}, id=${track.id}`);
    });
    audioTracks.forEach((track, idx) => {
      console.log(`  [Video] Audio track ${idx}: enabled=${track.enabled}, state=${track.readyState}, id=${track.id}`);
    });

    // Assign stream to video element
    console.log(`[Video] Assigning stream ${stream.id} to video element`);
    video.srcObject = stream;
    assignedStreamIdRef.current = stream.id;
    console.log(`[Video] srcObject assignment complete`);

    // Listen for track changes
    const handleAddTrack = (event: Event) => {
      const mediaEvent = event as MediaStreamTrackEvent;
      console.log(
        `✓ Track added to stream: ${mediaEvent.track.kind}, enabled: ${mediaEvent.track.enabled}, readyState: ${mediaEvent.track.readyState}`,
      );
    };

    const handleRemoveTrack = (event: Event) => {
      const mediaEvent = event as MediaStreamTrackEvent;
      console.log(
        `✗ Track removed from stream: ${mediaEvent.track.kind}`,
      );
    };

    stream.addEventListener("addtrack", handleAddTrack);
    stream.addEventListener("removetrack", handleRemoveTrack);

    // Force play with explicit error handling
    const attemptPlay = async () => {
      try {
        // Check video element state BEFORE attempting play
        console.log(`[Video] Before play - readyState: ${video.readyState}, networkState: ${video.networkState}, paused: ${video.paused}`);
        
        const playPromise = await video.play();
        console.log(`[Video] ✓ Play successful. readyState: ${video.readyState}, networkState: ${video.networkState}`);
      } catch (err) {
        // Autoplay might be blocked, but we can still render the stream
        const errorMsg = (err as Error).message;
        if (errorMsg.includes("autoplay") || errorMsg.includes("NotAllowedError")) {
          console.warn(`[Video] ⚠ Autoplay blocked by browser policy`);
          // Force muted play as workaround
          video.muted = true;
          try {
            await video.play();
            console.log(`[Video] ✓ Play successful with muted. readyState: ${video.readyState}`);
          } catch (err2) {
            console.error(`[Video] ✗ Even muted play failed:`, (err2 as Error).message);
          }
        } else {
          console.error(`[Video] ✗ Video playback error:`, errorMsg);
        }
      }
    };

    attemptPlay();

    // Monitor video element state changes with more detail
    const handleLoadStart = () => console.log(`[Video] 📺 loadstart event`);
    const handleLoadedMetadata = () =>
      console.log(`[Video] 📺 loadedmetadata - duration: ${video.duration}, videoWidth: ${video.videoWidth}, videoHeight: ${video.videoHeight}`);
    const handleCanPlay = () => console.log(`[Video] 📺 canplay event`);
    const handlePlaying = () => console.log(`[Video] 📺 playing event - videoWidth: ${video.videoWidth}, videoHeight: ${video.videoHeight}`);
    const handleError = () => {
      const errorCode = video.error?.code;
      const errorMsg = video.error?.message;
      console.error(`[Video] ✗ error event - code: ${errorCode}, message: ${errorMsg}`);
    };
    const handleSuspend = () => console.log(`[Video] 📺 suspend event`);
    const handleStalled = () => console.log(`[Video] 📺 stalled event - readyState: ${video.readyState}`);
    const handleDataUnavailable = () => console.log(`[Video] ⚠ <video> no data to display`);

    video.addEventListener("loadstart", handleLoadStart);
    video.addEventListener("loadedmetadata", handleLoadedMetadata);
    video.addEventListener("canplay", handleCanPlay);
    video.addEventListener("playing", handlePlaying);
    video.addEventListener("error", handleError);
    video.addEventListener("suspend", handleSuspend);
    video.addEventListener("stalled", handleStalled);
    
    // Check readyState periodically
    const stateCheckInterval = setInterval(() => {
      if (video.readyState === 0) {
        console.warn(`[Video] ⚠ readyState stuck at 0 (HAVE_NOTHING) - no data available`);
      } else if (video.readyState === 4) {
        console.log(`[Video] ✓ readyState: 4 (HAVE_ENOUGH_DATA)`);
      }
    }, 2000);

    return () => {
      clearInterval(stateCheckInterval);
      stream.removeEventListener("addtrack", handleAddTrack);
      stream.removeEventListener("removetrack", handleRemoveTrack);
      video.removeEventListener("loadstart", handleLoadStart);
      video.removeEventListener("loadedmetadata", handleLoadedMetadata);
      video.removeEventListener("canplay", handleCanPlay);
      video.removeEventListener("playing", handlePlaying);
      video.removeEventListener("error", handleError);
      video.removeEventListener("suspend", handleSuspend);
      video.removeEventListener("stalled", handleStalled);
    };
  }, [stream]);

  return (
    <>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={muted}
        style={{ width: "100%", height: "100%" }}
      />
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
    </>
  );
});

export { VideoPanel, Video };
