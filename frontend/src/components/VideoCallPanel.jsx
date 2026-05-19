import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Peer } from "peerjs";
import { getWebRtcConfig } from "../lib/webrtcApi";

const CALL_ACK_TIMEOUT_MS = 8000;

function emitWithAck(socket, eventName, payload, timeoutMs = CALL_ACK_TIMEOUT_MS) {
  return new Promise((resolve, reject) => {
    if (!socket) {
      reject(new Error("Socket is not ready"));
      return;
    }

    let settled = false;
    const timeout = setTimeout(() => {
      if (settled) {
        return;
      }
      settled = true;
      reject(new Error(`Timed out waiting for "${eventName}"`));
    }, timeoutMs);

    socket.emit(eventName, payload, (ack) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timeout);
      if (ack?.ok === false) {
        reject(new Error(ack.message || `${eventName} failed`));
        return;
      }
      resolve(ack || { ok: true });
    });
  });
}

function hasVideoTrack(stream) {
  return Boolean(stream?.getVideoTracks?.().length);
}

function MediaStreamView({ stream, muted = false }) {
  const mediaRef = useRef(null);
  const isVideoStream = hasVideoTrack(stream);

  useEffect(() => {
    const element = mediaRef.current;
    if (!element) {
      return;
    }
    element.srcObject = stream || null;
    return () => {
      if (element.srcObject === stream) {
        element.srcObject = null;
      }
    };
  }, [stream]);

  if (isVideoStream) {
    return (
      <video
        ref={mediaRef}
        autoPlay
        playsInline
        muted={muted}
        className="h-36 w-full rounded-md border border-slate-700 bg-slate-950 object-cover"
      />
    );
  }

  return (
    <div className="rounded-md border border-slate-700 bg-slate-950 p-3">
      <audio ref={mediaRef} autoPlay controls muted={muted} className="w-full" />
      <p className="mt-2 text-xs text-slate-400">Audio-only stream</p>
    </div>
  );
}

function resolveMediaModeFromPreference(preference) {
  if (preference === "audio") {
    return {
      mode: "audio",
      constraints: { audio: true, video: false },
    };
  }
  return {
    mode: "audio-video",
    constraints: { audio: true, video: true },
  };
}

function VideoCallPanel({
  roomId,
  accessToken,
  socket,
  currentUser,
  presenceUsers = [],
  disabled = false,
}) {
  const [isJoining, setIsJoining] = useState(false);
  const [isInCall, setIsInCall] = useState(false);
  const [mediaPreference, setMediaPreference] = useState("audio-video");
  const [peerId, setPeerId] = useState("");
  const [connectionStatus, setConnectionStatus] = useState("idle");
  const [callError, setCallError] = useState("");
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStreamsByPeerId, setRemoteStreamsByPeerId] = useState({});

  const peerRef = useRef(null);
  const localStreamRef = useRef(null);
  const activeCallsRef = useRef(new Map());

  const peerPresenceList = useMemo(
    () =>
      presenceUsers.filter(
        (presence) =>
          presence.userId !== currentUser?.id &&
          presence.voiceEnabled &&
          Boolean(presence.voicePeerId)
      ),
    [currentUser?.id, presenceUsers]
  );

  const remoteStreamEntries = useMemo(() => {
    return Object.entries(remoteStreamsByPeerId).map(([remotePeerId, stream]) => {
      const presence = presenceUsers.find((item) => item.voicePeerId === remotePeerId);
      return {
        remotePeerId,
        stream,
        userName: presence?.name || "User",
        userId: presence?.userId || "",
      };
    });
  }, [presenceUsers, remoteStreamsByPeerId]);

  const stopLocalStream = useCallback(() => {
    if (!localStreamRef.current) {
      return;
    }
    localStreamRef.current.getTracks().forEach((track) => track.stop());
    localStreamRef.current = null;
    setLocalStream(null);
  }, []);

  const clearAllCalls = useCallback(() => {
    activeCallsRef.current.forEach((call) => {
      try {
        call.close();
      } catch {
        // ignore close errors
      }
    });
    activeCallsRef.current.clear();
    setRemoteStreamsByPeerId({});
  }, []);

  const destroyPeer = useCallback(() => {
    if (!peerRef.current) {
      return;
    }
    try {
      peerRef.current.destroy();
    } catch {
      // ignore destroy errors
    }
    peerRef.current = null;
    setPeerId("");
  }, []);

  const leaveCall = useCallback(
    async ({ silent = false } = {}) => {
      const activeRoomId = String(roomId || "").trim();
      const activeSocket = socket;
      if (activeRoomId && activeSocket?.connected) {
        try {
          await emitWithAck(activeSocket, "webrtc:clear", { roomId: activeRoomId });
        } catch {
          // clear is best effort
        }
      }

      clearAllCalls();
      destroyPeer();
      stopLocalStream();
      setMuted(false);
      setCameraOff(false);
      setIsInCall(false);
      setConnectionStatus("idle");
      if (!silent) {
        setCallError("");
      }
    },
    [clearAllCalls, destroyPeer, roomId, socket, stopLocalStream]
  );

  const ensureLocalStream = useCallback(async () => {
    if (localStreamRef.current) {
      return localStreamRef.current;
    }
    const media = resolveMediaModeFromPreference(mediaPreference);
    const stream = await navigator.mediaDevices.getUserMedia(media.constraints);
    localStreamRef.current = stream;
    setLocalStream(stream);
    setMuted(false);
    setCameraOff(media.mode === "audio");
    return stream;
  }, [mediaPreference]);

  const registerMediaConnection = useCallback((mediaConnection) => {
    const remotePeerId = String(mediaConnection.peer || "");
    if (!remotePeerId) {
      return;
    }

    const existingCall = activeCallsRef.current.get(remotePeerId);
    if (existingCall && existingCall !== mediaConnection) {
      existingCall.close();
    }
    activeCallsRef.current.set(remotePeerId, mediaConnection);

    mediaConnection.on("stream", (remoteStream) => {
      setRemoteStreamsByPeerId((prev) => ({
        ...prev,
        [remotePeerId]: remoteStream,
      }));
    });

    const cleanup = () => {
      activeCallsRef.current.delete(remotePeerId);
      setRemoteStreamsByPeerId((prev) => {
        const next = { ...prev };
        delete next[remotePeerId];
        return next;
      });
    };

    mediaConnection.on("close", cleanup);
    mediaConnection.on("error", cleanup);
  }, []);

  const tryCallingPeer = useCallback(
    async (remotePeerId) => {
      const peerInstance = peerRef.current;
      if (!peerInstance || !remotePeerId || remotePeerId === peerId) {
        return;
      }
      if (activeCallsRef.current.has(remotePeerId)) {
        return;
      }

      if (peerId && peerId.localeCompare(remotePeerId) > 0) {
        // Deterministic initiator choice to avoid double calls.
        return;
      }

      const stream = await ensureLocalStream();
      const call = peerInstance.call(remotePeerId, stream, {
        metadata: {
          roomId,
          userId: currentUser?.id || "",
          name: currentUser?.name || "",
        },
      });
      registerMediaConnection(call);
    },
    [currentUser?.id, currentUser?.name, ensureLocalStream, peerId, registerMediaConnection, roomId]
  );

  const joinCall = useCallback(async () => {
    if (!roomId || !accessToken) {
      setCallError("Join a room first.");
      return;
    }
    if (!socket?.connected) {
      setCallError("Realtime socket is disconnected. Rejoin room first.");
      return;
    }
    if (!navigator?.mediaDevices?.getUserMedia) {
      setCallError("Your browser does not support getUserMedia.");
      return;
    }
    if (typeof window.RTCPeerConnection === "undefined") {
      setCallError("Your browser does not support RTCPeerConnection.");
      return;
    }
    if (isInCall) {
      return;
    }

    setIsJoining(true);
    setCallError("");
    setConnectionStatus("preparing");

    try {
      const [{ peerServer, iceServers, recommendedPeerId }, stream] = await Promise.all([
        getWebRtcConfig({ token: accessToken }),
        ensureLocalStream(),
      ]);

      const peer = new Peer(recommendedPeerId, {
        host: peerServer.host,
        port: peerServer.port,
        path: peerServer.path,
        secure: peerServer.secure,
        key: peerServer.key,
        config: {
          iceServers,
        },
      });

      peerRef.current = peer;

      peer.on("open", async (openedPeerId) => {
        setPeerId(openedPeerId);
        setConnectionStatus("connected");
        setIsInCall(true);
        try {
          await emitWithAck(socket, "webrtc:announce", {
            roomId,
            peerId: openedPeerId,
            media: mediaPreference,
          });
        } catch (error) {
          setCallError(error.message || "Failed to announce peer in room.");
        }
      });

      peer.on("call", async (incomingCall) => {
        try {
          const local = localStreamRef.current || stream || (await ensureLocalStream());
          incomingCall.answer(local);
          registerMediaConnection(incomingCall);
        } catch (error) {
          setCallError(error.message || "Failed to answer incoming call.");
        }
      });

      peer.on("error", (error) => {
        setConnectionStatus("error");
        setCallError(error?.message || "Peer connection error");
      });

      peer.on("disconnected", () => {
        setConnectionStatus("disconnected");
      });

      peer.on("close", () => {
        setConnectionStatus("closed");
      });
    } catch (error) {
      setCallError(error.message || "Failed to start video call");
      setConnectionStatus("error");
      await leaveCall({ silent: true });
    } finally {
      setIsJoining(false);
    }
  }, [
    accessToken,
    ensureLocalStream,
    isInCall,
    leaveCall,
    mediaPreference,
    registerMediaConnection,
    roomId,
    socket,
  ]);

  useEffect(() => {
    if (!isInCall || !peerId || !roomId) {
      return;
    }

    peerPresenceList.forEach((presence) => {
      tryCallingPeer(presence.voicePeerId);
    });
  }, [isInCall, peerId, peerPresenceList, roomId, tryCallingPeer]);

  useEffect(() => {
    if (!disabled || !isInCall) {
      return;
    }
    let cancelled = false;
    Promise.resolve().then(() => {
      if (!cancelled) {
        leaveCall({ silent: true });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [disabled, isInCall, leaveCall]);

  useEffect(() => {
    return () => {
      leaveCall({ silent: true });
    };
  }, [leaveCall]);

  function toggleMute() {
    const stream = localStreamRef.current;
    if (!stream) {
      return;
    }
    const nextMuted = !muted;
    stream.getAudioTracks().forEach((track) => {
      track.enabled = !nextMuted;
    });
    setMuted(nextMuted);
  }

  function toggleCamera() {
    const stream = localStreamRef.current;
    if (!stream) {
      return;
    }
    const nextCameraOff = !cameraOff;
    stream.getVideoTracks().forEach((track) => {
      track.enabled = !nextCameraOff;
    });
    setCameraOff(nextCameraOff);
  }

  return (
    <section className="rounded-xl border border-slate-700 bg-slate-900/70 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-base font-semibold">Video Call (WebRTC)</h3>
        <span className="rounded bg-slate-800 px-2 py-1 text-xs text-slate-300">
          {connectionStatus}
        </span>
      </div>

      <p className="mt-1 text-xs text-slate-400">
        Uses self-hosted PeerJS signaling + native getUserMedia/RTCPeerConnection.
      </p>

      <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto_auto_auto]">
        <select
          value={mediaPreference}
          onChange={(event) => setMediaPreference(event.target.value)}
          disabled={isInCall || isJoining || disabled}
          className="rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm"
        >
          <option value="audio-video">Audio + Video</option>
          <option value="audio">Audio Only</option>
        </select>

        {!isInCall ? (
          <button
            type="button"
            onClick={joinCall}
            disabled={disabled || isJoining}
            className="rounded-md bg-cyan-400 px-3 py-1.5 text-sm font-medium text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isJoining ? "Joining..." : "Join Call"}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => leaveCall()}
            className="rounded-md border border-rose-600 px-3 py-1.5 text-sm font-medium text-rose-200"
          >
            Leave Call
          </button>
        )}

        <button
          type="button"
          onClick={toggleMute}
          disabled={!isInCall}
          className="rounded-md border border-slate-600 px-3 py-1.5 text-sm disabled:cursor-not-allowed disabled:opacity-60"
        >
          {muted ? "Unmute" : "Mute"}
        </button>

        <button
          type="button"
          onClick={toggleCamera}
          disabled={!isInCall || mediaPreference === "audio"}
          className="rounded-md border border-slate-600 px-3 py-1.5 text-sm disabled:cursor-not-allowed disabled:opacity-60"
        >
          {cameraOff ? "Camera On" : "Camera Off"}
        </button>
      </div>

      <p className="mt-2 text-xs text-slate-400">
        Peer ID: {peerId || "-"}
      </p>

      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <div className="rounded-lg border border-slate-700 bg-slate-950/70 p-2">
          <p className="mb-2 text-xs uppercase tracking-wide text-slate-400">You</p>
          {localStream ? (
            <MediaStreamView stream={localStream} muted />
          ) : (
            <p className="text-sm text-slate-400">Local preview appears after joining call.</p>
          )}
        </div>

        <div className="rounded-lg border border-slate-700 bg-slate-950/70 p-2">
          <p className="mb-2 text-xs uppercase tracking-wide text-slate-400">
            Remote ({remoteStreamEntries.length})
          </p>
          {remoteStreamEntries.length ? (
            <div className="space-y-2">
              {remoteStreamEntries.map((entry) => (
                <div key={entry.remotePeerId} className="rounded-md border border-slate-700 bg-slate-900/70 p-2">
                  <p className="mb-1 text-sm font-medium text-slate-100">
                    {entry.userName}
                    {entry.userId ? ` (${entry.userId.slice(0, 6)})` : ""}
                  </p>
                  <MediaStreamView stream={entry.stream} />
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-400">No remote peers connected yet.</p>
          )}
        </div>
      </div>

      {callError ? (
        <p className="mt-3 rounded-md border border-rose-600/60 bg-rose-950/40 px-3 py-2 text-sm text-rose-200">
          {callError}
        </p>
      ) : null}
    </section>
  );
}

export default VideoCallPanel;
