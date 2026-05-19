import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import HlsPlyrPlayer from "../components/HlsPlyrPlayer.jsx";
import ReactUnifiedPlayer from "../components/ReactUnifiedPlayer.jsx";
import RoomChatPanel from "../components/RoomChatPanel.jsx";
import SpotifyWebPlaybackPanel from "../components/SpotifyWebPlaybackPanel.jsx";
import VideoCallPanel from "../components/VideoCallPanel.jsx";
import {
  exchangeSpotifyCode,
  getSpotifyAuthUrl,
  refreshSpotifyToken,
  searchSpotify,
  searchYouTube,
  uploadMedia,
} from "../lib/mediaApi";
import { createSyncSocket, getSocketServerUrl } from "../lib/socketSync.js";
import { useAuth } from "../state/AuthContext.jsx";

const SPOTIFY_USER_ACCESS_TOKEN_KEY = "cozzywood_spotify_user_access_token";
const SPOTIFY_USER_REFRESH_TOKEN_KEY = "cozzywood_spotify_user_refresh_token";
const DEFAULT_ROOM_ID = "cozzywood-main";
const MAX_POSITION_SECONDS = 86_400;
const SEEK_EMIT_MIN_DELTA = 0.35;
const SYNC_SUPPRESS_MS = 1_200;

function normalizePlayerEngine(engine) {
  return engine === "plyr" ? "plyr" : "reactplayer";
}

function normalizeRoomId(roomId) {
  const normalized = String(roomId || "").trim().toLowerCase();
  if (!normalized) {
    return "";
  }
  return normalized.slice(0, 80);
}

function clampPlaybackRate(rate) {
  const numeric = Number(rate);
  if (!Number.isFinite(numeric)) {
    return 1;
  }
  return Math.min(Math.max(numeric, 0.25), 2);
}

function clampPosition(seconds, fallbackValue = 0) {
  const numeric = Number(seconds);
  if (!Number.isFinite(numeric)) {
    return fallbackValue;
  }
  return Math.min(Math.max(numeric, 0), MAX_POSITION_SECONDS);
}

function getErrorMessage(error, fallbackMessage) {
  return (
    error?.response?.data?.message ||
    error?.message ||
    fallbackMessage
  );
}

function sortMessagesByCreatedAt(messages) {
  return [...messages].sort((left, right) => {
    const leftTime = new Date(left.createdAt || 0).getTime();
    const rightTime = new Date(right.createdAt || 0).getTime();
    return leftTime - rightTime;
  });
}

function mergeChatMessages(previousMessages, incomingMessages) {
  const map = new Map();
  [...previousMessages, ...incomingMessages].forEach((message) => {
    if (!message?.id) {
      return;
    }
    map.set(message.id, message);
  });
  return sortMessagesByCreatedAt(Array.from(map.values()));
}

function emitWithAck(socket, eventName, payload, timeoutMs = 8_000) {
  return new Promise((resolve, reject) => {
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
      if (ack && ack.ok === false) {
        reject(new Error(ack.message || `${eventName} failed`));
        return;
      }
      resolve(ack || { ok: true });
    });
  });
}

function MediaPage() {
  const { accessToken, user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const [urlInput, setUrlInput] = useState("");
  const [mediaUrl, setMediaUrl] = useState("");
  const [mediaPoster, setMediaPoster] = useState("");
  const [mediaTitle, setMediaTitle] = useState("");
  const [playerEngine, setPlayerEngine] = useState("reactplayer");
  const [playerPlaying, setPlayerPlaying] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isBuffering, setIsBuffering] = useState(false);
  const [syncCommand, setSyncCommand] = useState(null);
  const [currentPositionSeconds, setCurrentPositionSeconds] = useState(0);
  const [syncUpdatedAt, setSyncUpdatedAt] = useState("");

  const [statusMessage, setStatusMessage] = useState("");
  const [isWorking, setIsWorking] = useState(false);

  const [youtubeQuery, setYoutubeQuery] = useState("");
  const [youtubeResults, setYoutubeResults] = useState([]);

  const [spotifyQuery, setSpotifyQuery] = useState("");
  const [spotifyResults, setSpotifyResults] = useState({ tracks: [], albums: [], playlists: [] });
  const [selectedSpotifyUri, setSelectedSpotifyUri] = useState("");
  const [spotifyUserToken, setSpotifyUserToken] = useState(
    () => localStorage.getItem(SPOTIFY_USER_ACCESS_TOKEN_KEY) || ""
  );
  const [spotifyRefreshTokenValue, setSpotifyRefreshTokenValue] = useState(
    () => localStorage.getItem(SPOTIFY_USER_REFRESH_TOKEN_KEY) || ""
  );

  const [socketStatus, setSocketStatus] = useState("disconnected");
  const [socketError, setSocketError] = useState("");
  const [roomInput, setRoomInput] = useState(DEFAULT_ROOM_ID);
  const [activeRoomId, setActiveRoomId] = useState("");
  const [presenceUsers, setPresenceUsers] = useState([]);
  const [chatMessages, setChatMessages] = useState([]);
  const [socketInstance, setSocketInstance] = useState(null);

  const socketRef = useRef(null);
  const activeRoomIdRef = useRef("");
  const suppressOutboundUntilRef = useRef(0);
  const currentPositionRef = useRef(0);
  const lastSeekEmitRef = useRef({ at: 0, position: 0 });

  const socketServerUrl = useMemo(() => getSocketServerUrl(), []);
  const isHlsSource = useMemo(() => mediaUrl.includes(".m3u8"), [mediaUrl]);

  useEffect(() => {
    activeRoomIdRef.current = activeRoomId;
  }, [activeRoomId]);

  const canEmitSync = useCallback(() => {
    const socket = socketRef.current;
    return Boolean(activeRoomIdRef.current && socket?.connected);
  }, []);

  const shouldSuppressOutboundSync = useCallback(
    () => Date.now() < suppressOutboundUntilRef.current,
    []
  );

  const emitSyncEvent = useCallback((eventName, payload = {}) => {
    const roomId = activeRoomIdRef.current;
    const socket = socketRef.current;
    if (!roomId || !socket || !socket.connected) {
      return;
    }

    socket.emit(eventName, { roomId, ...payload }, (ack) => {
      if (ack && ack.ok === false) {
        setSocketError(ack.message || `Failed to send ${eventName}`);
      }
    });
  }, []);

  const applyRoomState = useCallback((nextState, sourceEvent) => {
    if (!nextState) {
      return;
    }

    const nextSourceUrl = String(nextState.sourceUrl || "");
    const nextSourcePoster = String(nextState.sourcePoster || "");
    const nextSourceTitle = String(nextState.sourceTitle || "");
    const nextEngine = normalizePlayerEngine(nextState.playerEngine);
    const nextRate = clampPlaybackRate(nextState.playbackRate);
    const nextPosition = clampPosition(nextState.positionSeconds, 0);
    const nextIsPlaying = Boolean(nextState.isPlaying);
    const nextIsBuffering = Boolean(nextState.isBuffering);

    suppressOutboundUntilRef.current = Date.now() + SYNC_SUPPRESS_MS;

    setMediaUrl(nextSourceUrl);
    setMediaPoster(nextSourcePoster);
    setMediaTitle(nextSourceTitle);
    setPlayerEngine(nextEngine);
    if (nextSourceUrl) {
      setUrlInput(nextSourceUrl);
    }
    setPlayerPlaying(nextIsPlaying);
    setPlaybackRate(nextRate);
    setIsBuffering(nextIsBuffering);
    setCurrentPositionSeconds(nextPosition);
    currentPositionRef.current = nextPosition;
    setSyncUpdatedAt(String(nextState.updatedAt || new Date().toISOString()));

    if (sourceEvent === "sync:source-change" || sourceEvent === "room:snapshot") {
      setSyncCommand({
        id: `${Date.now()}-${Math.random()}`,
        type: "source-change",
        positionSeconds: nextPosition,
      });
      return;
    }
    if (sourceEvent === "sync:seek") {
      setSyncCommand({
        id: `${Date.now()}-${Math.random()}`,
        type: "seek",
        positionSeconds: nextPosition,
      });
    }
  }, []);

  useEffect(() => {
    const code = searchParams.get("code");
    if (!code || !accessToken) {
      return undefined;
    }

    let isMounted = true;
    async function finishSpotifyAuth() {
      setIsWorking(true);
      try {
        const payload = await exchangeSpotifyCode({ token: accessToken, code });
        if (!isMounted) {
          return;
        }

        const nextAccessToken = payload.access_token || "";
        const nextRefreshToken = payload.refresh_token || spotifyRefreshTokenValue;
        setSpotifyUserToken(nextAccessToken);
        setSpotifyRefreshTokenValue(nextRefreshToken);
        localStorage.setItem(SPOTIFY_USER_ACCESS_TOKEN_KEY, nextAccessToken);
        if (nextRefreshToken) {
          localStorage.setItem(SPOTIFY_USER_REFRESH_TOKEN_KEY, nextRefreshToken);
        }

        setStatusMessage("Spotify connected successfully.");
        const nextParams = new URLSearchParams(searchParams);
        nextParams.delete("code");
        nextParams.delete("state");
        nextParams.delete("error");
        setSearchParams(nextParams, { replace: true });
      } catch (error) {
        setStatusMessage(getErrorMessage(error, "Spotify connection failed."));
      } finally {
        if (isMounted) {
          setIsWorking(false);
        }
      }
    }

    finishSpotifyAuth();
    return () => {
      isMounted = false;
    };
  }, [accessToken, searchParams, setSearchParams, spotifyRefreshTokenValue]);

  useEffect(() => {
    if (!accessToken) {
      return undefined;
    }

    const socket = createSyncSocket(accessToken);
    socketRef.current = socket;
    queueMicrotask(() => {
      if (socketRef.current === socket) {
        setSocketInstance(socket);
      }
    });

    const handleConnect = () => {
      setSocketStatus("connected");
      setSocketError("");
      const roomId = activeRoomIdRef.current;
      if (!roomId) {
        return;
      }

      socket.emit("room:join", { roomId }, (ack) => {
        if (ack?.ok === false) {
          setSocketError(ack.message || "Failed to rejoin room after reconnect.");
        }
      });
    };

    const handleDisconnect = () => {
      setSocketStatus("disconnected");
      setPresenceUsers([]);
      setChatMessages([]);
    };

    const handleConnectError = (error) => {
      setSocketStatus("error");
      setSocketError(error?.message || "Socket connection failed.");
    };

    const handleRoomSnapshot = (payload = {}) => {
      if (payload.roomId) {
        setActiveRoomId(payload.roomId);
        activeRoomIdRef.current = payload.roomId;
      }
      if (Array.isArray(payload.users)) {
        setPresenceUsers(payload.users);
      }
      if (Array.isArray(payload.chatMessages)) {
        setChatMessages(sortMessagesByCreatedAt(payload.chatMessages));
      }
      if (payload.state) {
        applyRoomState(payload.state, "room:snapshot");
      }
    };

    const handlePresenceUpdate = (payload = {}) => {
      if (payload.roomId && payload.roomId !== activeRoomIdRef.current) {
        return;
      }
      setPresenceUsers(Array.isArray(payload.users) ? payload.users : []);
    };

    const handleSyncSourceChange = (payload = {}) => {
      if (payload.roomId !== activeRoomIdRef.current || !payload.state) {
        return;
      }
      applyRoomState(payload.state, "sync:source-change");
    };

    const handleSyncPlay = (payload = {}) => {
      if (payload.roomId !== activeRoomIdRef.current || !payload.state) {
        return;
      }
      applyRoomState(payload.state, "sync:play");
    };

    const handleSyncPause = (payload = {}) => {
      if (payload.roomId !== activeRoomIdRef.current || !payload.state) {
        return;
      }
      applyRoomState(payload.state, "sync:pause");
    };

    const handleSyncSeek = (payload = {}) => {
      if (payload.roomId !== activeRoomIdRef.current || !payload.state) {
        return;
      }
      applyRoomState(payload.state, "sync:seek");
    };

    const handleSyncBuffer = (payload = {}) => {
      if (payload.roomId !== activeRoomIdRef.current || !payload.state) {
        return;
      }
      applyRoomState(payload.state, "sync:buffer");
    };

    const handleSyncRateChange = (payload = {}) => {
      if (payload.roomId !== activeRoomIdRef.current || !payload.state) {
        return;
      }
      applyRoomState(payload.state, "sync:rate-change");
    };

    const handleChatHistory = (payload = {}) => {
      if (payload.roomId !== activeRoomIdRef.current) {
        return;
      }
      if (!Array.isArray(payload.messages)) {
        return;
      }
      setChatMessages(sortMessagesByCreatedAt(payload.messages));
    };

    const handleChatNew = (payload = {}) => {
      if (payload.roomId !== activeRoomIdRef.current || !payload.message?.id) {
        return;
      }
      setChatMessages((prev) => mergeChatMessages(prev, [payload.message]));
    };

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("connect_error", handleConnectError);
    socket.on("room:snapshot", handleRoomSnapshot);
    socket.on("presence:update", handlePresenceUpdate);
    socket.on("sync:source-change", handleSyncSourceChange);
    socket.on("sync:play", handleSyncPlay);
    socket.on("sync:pause", handleSyncPause);
    socket.on("sync:seek", handleSyncSeek);
    socket.on("sync:buffer", handleSyncBuffer);
    socket.on("sync:rate-change", handleSyncRateChange);
    socket.on("chat:history", handleChatHistory);
    socket.on("chat:new", handleChatNew);

    socket.connect();

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
      if (socketRef.current === socket) {
        socketRef.current = null;
      }
      setSocketStatus("disconnected");
      setPresenceUsers([]);
      setChatMessages([]);
      queueMicrotask(() => setSocketInstance(null));
    };
  }, [accessToken, applyRoomState]);

  const loadSelectedSource = useCallback(
    (url, { poster = "", preferredEngine = "reactplayer", title = "", emitSync = true } = {}) => {
      const nextUrl = String(url || "").trim();
      if (!nextUrl) {
        return;
      }

      const nextEngine = normalizePlayerEngine(preferredEngine);
      setMediaUrl(nextUrl);
      setMediaPoster(poster);
      setMediaTitle(title);
      setPlayerEngine(nextEngine);
      setUrlInput(nextUrl);
      setPlayerPlaying(false);
      setIsBuffering(false);
      setCurrentPositionSeconds(0);
      currentPositionRef.current = 0;
      setSyncCommand({
        id: `${Date.now()}-${Math.random()}`,
        type: "source-change",
        positionSeconds: 0,
      });

      if (emitSync && canEmitSync() && !shouldSuppressOutboundSync()) {
        emitSyncEvent("sync:source-change", {
          url: nextUrl,
          poster,
          title,
          playerEngine: nextEngine,
          positionSeconds: 0,
          isPlaying: false,
          playbackRate,
        });
      }
    },
    [canEmitSync, emitSyncEvent, playbackRate, shouldSuppressOutboundSync]
  );

  const updateCurrentPosition = useCallback((seconds) => {
    const nextPosition = clampPosition(seconds, currentPositionRef.current);
    currentPositionRef.current = nextPosition;
    setCurrentPositionSeconds(nextPosition);
    return nextPosition;
  }, []);

  const handlePlayerPlay = useCallback(() => {
    setPlayerPlaying(true);
    setIsBuffering(false);
    if (!canEmitSync() || shouldSuppressOutboundSync()) {
      return;
    }
    emitSyncEvent("sync:play", {
      positionSeconds: currentPositionRef.current,
    });
  }, [canEmitSync, emitSyncEvent, shouldSuppressOutboundSync]);

  const handlePlayerPause = useCallback(() => {
    setPlayerPlaying(false);
    if (!canEmitSync() || shouldSuppressOutboundSync()) {
      return;
    }
    emitSyncEvent("sync:pause", {
      positionSeconds: currentPositionRef.current,
    });
  }, [canEmitSync, emitSyncEvent, shouldSuppressOutboundSync]);

  const handlePlayerWaiting = useCallback(() => {
    setIsBuffering(true);
    if (!canEmitSync() || shouldSuppressOutboundSync()) {
      return;
    }
    emitSyncEvent("sync:buffer", { isBuffering: true });
  }, [canEmitSync, emitSyncEvent, shouldSuppressOutboundSync]);

  const handlePlayerPlaying = useCallback(() => {
    setPlayerPlaying(true);
    setIsBuffering(false);
    if (!canEmitSync() || shouldSuppressOutboundSync()) {
      return;
    }
    emitSyncEvent("sync:buffer", { isBuffering: false });
  }, [canEmitSync, emitSyncEvent, shouldSuppressOutboundSync]);

  const handlePlayerRateChange = useCallback(
    (rate) => {
      const nextRate = clampPlaybackRate(rate);
      setPlaybackRate(nextRate);
      if (!canEmitSync() || shouldSuppressOutboundSync()) {
        return;
      }
      emitSyncEvent("sync:rate-change", { playbackRate: nextRate });
    },
    [canEmitSync, emitSyncEvent, shouldSuppressOutboundSync]
  );

  const handlePlayerTimeUpdate = useCallback(
    (seconds) => {
      updateCurrentPosition(seconds);
    },
    [updateCurrentPosition]
  );

  const handlePlayerSeek = useCallback(
    (seconds) => {
      const nextPosition = updateCurrentPosition(seconds);
      if (!canEmitSync() || shouldSuppressOutboundSync()) {
        return;
      }
      const now = Date.now();
      const last = lastSeekEmitRef.current;
      if (Math.abs(nextPosition - last.position) < SEEK_EMIT_MIN_DELTA && now - last.at < 400) {
        return;
      }
      lastSeekEmitRef.current = { at: now, position: nextPosition };
      emitSyncEvent("sync:seek", { positionSeconds: nextPosition });
    },
    [canEmitSync, emitSyncEvent, shouldSuppressOutboundSync, updateCurrentPosition]
  );

  async function handleYoutubeSearch(event) {
    event.preventDefault();
    if (!youtubeQuery.trim() || !accessToken) {
      return;
    }

    setIsWorking(true);
    setStatusMessage("");
    try {
      const payload = await searchYouTube({ token: accessToken, q: youtubeQuery.trim() });
      setYoutubeResults(payload.items || []);
      if (!payload.items?.length) {
        setStatusMessage("No YouTube videos found for this query.");
      }
    } catch (error) {
      setStatusMessage(getErrorMessage(error, "YouTube search failed."));
    } finally {
      setIsWorking(false);
    }
  }

  async function handleSpotifySearch(event) {
    event.preventDefault();
    if (!spotifyQuery.trim() || !accessToken) {
      return;
    }

    setIsWorking(true);
    setStatusMessage("");
    try {
      const payload = await searchSpotify({ token: accessToken, q: spotifyQuery.trim() });
      setSpotifyResults({
        tracks: payload.tracks || [],
        albums: payload.albums || [],
        playlists: payload.playlists || [],
      });
      if (!payload.tracks?.length && !payload.albums?.length && !payload.playlists?.length) {
        setStatusMessage("No Spotify results found for this query.");
      }
    } catch (error) {
      setStatusMessage(getErrorMessage(error, "Spotify search failed."));
    } finally {
      setIsWorking(false);
    }
  }

  async function handleUploadFile(event) {
    const file = event.target.files?.[0];
    if (!file || !accessToken) {
      return;
    }

    setIsWorking(true);
    setStatusMessage("");
    try {
      const payload = await uploadMedia({ token: accessToken, file });
      const isHls = payload.url.includes(".m3u8") || payload.mimetype.includes("application/vnd.apple.mpegurl");
      loadSelectedSource(payload.url, {
        preferredEngine: isHls ? "plyr" : "reactplayer",
        title: file.name,
      });
      setStatusMessage(`Upload complete (${Math.round(payload.size / 1024)} KB).`);
    } catch (error) {
      setStatusMessage(getErrorMessage(error, "Upload failed."));
    } finally {
      setIsWorking(false);
      event.target.value = "";
    }
  }

  async function handleConnectSpotify() {
    if (!accessToken) {
      return;
    }

    setIsWorking(true);
    setStatusMessage("");
    try {
      const payload = await getSpotifyAuthUrl({ token: accessToken });
      window.location.href = payload.url;
    } catch (error) {
      setStatusMessage(getErrorMessage(error, "Failed to start Spotify auth."));
      setIsWorking(false);
    }
  }

  async function handleRefreshSpotifyToken() {
    if (!accessToken || !spotifyRefreshTokenValue) {
      setStatusMessage("No Spotify refresh token found.");
      return;
    }

    setIsWorking(true);
    setStatusMessage("");
    try {
      const payload = await refreshSpotifyToken({ token: accessToken, refreshToken: spotifyRefreshTokenValue });
      const nextAccessToken = payload.access_token || "";
      const nextRefreshToken = payload.refresh_token || spotifyRefreshTokenValue;
      setSpotifyUserToken(nextAccessToken);
      setSpotifyRefreshTokenValue(nextRefreshToken);
      localStorage.setItem(SPOTIFY_USER_ACCESS_TOKEN_KEY, nextAccessToken);
      localStorage.setItem(SPOTIFY_USER_REFRESH_TOKEN_KEY, nextRefreshToken);
      setStatusMessage("Spotify user token refreshed.");
    } catch (error) {
      setStatusMessage(getErrorMessage(error, "Failed to refresh Spotify token."));
    } finally {
      setIsWorking(false);
    }
  }

  async function handleJoinRoom() {
    const roomId = normalizeRoomId(roomInput);
    if (!roomId) {
      setSocketError("Room ID is required.");
      return;
    }

    const socket = socketRef.current;
    if (!socket) {
      setSocketError("Socket is not ready yet.");
      return;
    }

    setIsWorking(true);
    setSocketError("");
    try {
      if (!socket.connected) {
        socket.connect();
      }
      const ack = await emitWithAck(socket, "room:join", { roomId });
      const joinedRoomId = ack.roomId || roomId;
      setActiveRoomId(joinedRoomId);
      activeRoomIdRef.current = joinedRoomId;
      setRoomInput(joinedRoomId);
      setStatusMessage(`Joined room "${joinedRoomId}".`);
      socket.emit("sync:state-request", { roomId: joinedRoomId });
      socket.emit("chat:history-request", { roomId: joinedRoomId });
    } catch (error) {
      setSocketError(getErrorMessage(error, "Failed to join room."));
    } finally {
      setIsWorking(false);
    }
  }

  async function handleLeaveRoom() {
    const roomId = activeRoomIdRef.current;
    if (!roomId) {
      return;
    }

    const socket = socketRef.current;
    setIsWorking(true);
    setSocketError("");
    try {
      if (socket?.connected) {
        await emitWithAck(socket, "room:leave", { roomId });
      }
      setActiveRoomId("");
      activeRoomIdRef.current = "";
      setPresenceUsers([]);
      setChatMessages([]);
      setStatusMessage(`Left room "${roomId}".`);
    } catch (error) {
      setSocketError(getErrorMessage(error, "Failed to leave room."));
    } finally {
      setIsWorking(false);
    }
  }

  async function handleRequestSnapshot() {
    const roomId = activeRoomIdRef.current;
    const socket = socketRef.current;
    if (!roomId || !socket?.connected) {
      return;
    }

    setSocketError("");
    try {
      const ack = await emitWithAck(socket, "sync:state-request", { roomId });
      if (ack.state) {
        applyRoomState(ack.state, "room:snapshot");
      }
      if (Array.isArray(ack.users)) {
        setPresenceUsers(ack.users);
      }
      if (Array.isArray(ack.chatMessages)) {
        setChatMessages(sortMessagesByCreatedAt(ack.chatMessages));
      }
      setStatusMessage("Room state refreshed.");
    } catch (error) {
      setSocketError(getErrorMessage(error, "Failed to refresh room state."));
    }
  }

  async function handleSendChatMessage(payload) {
    const roomId = activeRoomIdRef.current;
    const socket = socketRef.current;
    if (!roomId || !socket?.connected) {
      throw new Error("Join a room before sending chat messages");
    }

    const ack = await emitWithAck(socket, "chat:send", {
      roomId,
      messageType: payload.messageType,
      text: payload.text,
      gifUrl: payload.gifUrl,
    });

    if (ack?.message?.id) {
      setChatMessages((prev) => mergeChatMessages(prev, [ack.message]));
    }
  }

  return (
    <main className="min-h-screen bg-black/30 text-slate-100">
      <section className="mx-auto grid w-full max-w-7xl gap-6 px-5 py-8 lg:grid-cols-[340px_1fr]">
        <aside className="space-y-5">
          <div className="rounded-xl border border-white/10 bg-slate-900/40 backdrop-blur-md p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-amber-300">Cozzywood Phase 5</p>
            <h1 className="mt-2 text-xl font-semibold">Media + Realtime Sync</h1>
            <p className="mt-1 text-sm text-slate-300">Signed in as {user?.name}</p>
            <Link to="/dashboard" className="mt-3 inline-block text-sm font-medium text-amber-300 hover:text-amber-200">
              Back to dashboard
            </Link>
          </div>

          <div className="rounded-xl border border-white/10 bg-slate-900/40 backdrop-blur-md p-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-200">Room Sync</h2>
            <p className="mt-2 text-xs text-slate-400">Socket server: {socketServerUrl}</p>
            <div className="mt-2 inline-flex rounded bg-white/10 px-2 py-1 text-xs">
              Status: {socketStatus}
            </div>
            <input
              value={roomInput}
              onChange={(event) => setRoomInput(event.target.value)}
              placeholder="room id"
              className="mt-3 w-full rounded-md border border-white/10 bg-black/30 px-4 py-2.5 text-sm outline-none transition-all focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/50"
            />
            <div className="mt-2 grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={handleJoinRoom}
                disabled={isWorking}
                className="rounded-md bg-amber-500 px-2 py-1.5 text-xs font-medium text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Join
              </button>
              <button
                type="button"
                onClick={handleLeaveRoom}
                disabled={!activeRoomId || isWorking}
                className="rounded-md border border-slate-600 px-2 py-1.5 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-60"
              >
                Leave
              </button>
              <button
                type="button"
                onClick={handleRequestSnapshot}
                disabled={!activeRoomId}
                className="rounded-md border border-emerald-700 px-2 py-1.5 text-xs font-medium text-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Refresh
              </button>
            </div>
            <p className="mt-2 text-xs text-slate-400">Active room: {activeRoomId || "-"}</p>
          </div>

          <div className="rounded-xl border border-white/10 bg-slate-900/40 backdrop-blur-md p-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-200">Load URL</h2>
            <input
              value={urlInput}
              onChange={(event) => setUrlInput(event.target.value)}
              placeholder="https://example.com/video.mp4 or .m3u8"
              className="mt-2 w-full rounded-md border border-white/10 bg-black/30 px-4 py-2.5 text-sm outline-none transition-all focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/50"
            />
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={() => loadSelectedSource(urlInput, { preferredEngine: "reactplayer", title: "Custom URL" })}
                className="rounded-md bg-amber-500 px-3 py-1.5 text-sm font-medium text-slate-950"
              >
                Play (ReactPlayer)
              </button>
              <button
                type="button"
                onClick={() => loadSelectedSource(urlInput, { preferredEngine: "plyr", title: "Custom URL" })}
                className="rounded-md border border-slate-600 px-3 py-1.5 text-sm font-medium"
              >
                Play (Plyr + HLS)
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-slate-900/40 backdrop-blur-md p-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-200">Upload Personal Media</h2>
            <input
              type="file"
              accept="video/*,audio/*"
              onChange={handleUploadFile}
              className="mt-2 block w-full text-sm text-slate-300 file:mr-3 file:rounded-md file:border-0 file:bg-amber-500 file:px-3 file:py-1.5 file:font-medium file:text-slate-950 hover:file:bg-amber-400"
            />
            <p className="mt-2 text-xs text-slate-400">Backend storage and FFmpeg transcoding are configurable via server env vars.</p>
          </div>

          <div className="rounded-xl border border-white/10 bg-slate-900/40 backdrop-blur-md p-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-200">Spotify Account</h2>
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleConnectSpotify}
                className="rounded-md bg-emerald-400 px-3 py-1.5 text-sm font-medium text-slate-950"
              >
                Connect Spotify
              </button>
              <button
                type="button"
                onClick={handleRefreshSpotifyToken}
                className="rounded-md border border-emerald-700 px-3 py-1.5 text-sm font-medium text-emerald-100"
              >
                Refresh Token
              </button>
            </div>
            <p className="mt-2 text-xs text-slate-400">Needed for Spotify Web Playback SDK (Premium account).</p>
          </div>
        </aside>

        <div className="space-y-5">
          <div className="rounded-xl border border-white/10 bg-slate-900/40 backdrop-blur-md p-4">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="text-xs uppercase tracking-wide text-slate-300">Current Engine</span>
              <span className="rounded bg-white/10 px-2 py-1 text-xs">{playerEngine}</span>
              {isHlsSource ? <span className="rounded bg-sky-900 px-2 py-1 text-xs text-sky-100">HLS URL</span> : null}
              {activeRoomId ? <span className="rounded bg-emerald-900 px-2 py-1 text-xs text-emerald-100">Room: {activeRoomId}</span> : null}
            </div>
            <div className="mb-3 flex flex-wrap gap-2 text-xs text-slate-300">
              <span className="rounded bg-white/10 px-2 py-1">Time: {currentPositionSeconds.toFixed(1)}s</span>
              <span className="rounded bg-white/10 px-2 py-1">Rate: {playbackRate.toFixed(2)}x</span>
              <span className="rounded bg-white/10 px-2 py-1">{playerPlaying ? "Playing" : "Paused"}</span>
              <span className="rounded bg-white/10 px-2 py-1">{isBuffering ? "Buffering" : "Stable"}</span>
            </div>
            {playerEngine === "plyr" ? (
              <HlsPlyrPlayer
                src={mediaUrl}
                poster={mediaPoster}
                playing={playerPlaying}
                playbackRate={playbackRate}
                syncCommand={syncCommand}
                onPlay={handlePlayerPlay}
                onPause={handlePlayerPause}
                onWaiting={handlePlayerWaiting}
                onPlaying={handlePlayerPlaying}
                onRateChange={handlePlayerRateChange}
                onTimeUpdate={handlePlayerTimeUpdate}
                onSeek={handlePlayerSeek}
              />
            ) : (
              <ReactUnifiedPlayer
                src={mediaUrl}
                playing={playerPlaying}
                playbackRate={playbackRate}
                syncCommand={syncCommand}
                onPlay={handlePlayerPlay}
                onPause={handlePlayerPause}
                onWaiting={handlePlayerWaiting}
                onPlaying={handlePlayerPlaying}
                onRateChange={handlePlayerRateChange}
                onTimeUpdate={handlePlayerTimeUpdate}
                onSeek={handlePlayerSeek}
              />
            )}
            {mediaTitle ? <p className="mt-3 text-sm text-slate-300">Now loaded: {mediaTitle}</p> : null}
            {syncUpdatedAt ? (
              <p className="mt-1 text-xs text-slate-400">
                Last sync update: {new Date(syncUpdatedAt).toLocaleTimeString()}
              </p>
            ) : null}
          </div>

          <div className="rounded-xl border border-white/10 bg-slate-900/40 backdrop-blur-md p-4">
            <h3 className="text-base font-semibold">Room Presence</h3>
            <p className="mt-1 text-xs text-slate-400">Users online in this room: {presenceUsers.length}</p>
            {presenceUsers.length ? (
              <ul className="mt-3 space-y-2">
                {presenceUsers.map((presence) => (
                  <li key={presence.socketId} className="rounded-md border border-white/10 bg-black/20 px-3 py-2 text-sm">
                    <p className="font-medium">
                      {presence.name || "User"}
                      {presence.userId === user?.id ? " (You)" : ""}
                    </p>
                    <p className="text-xs text-slate-400">{presence.email || "No email"}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-slate-400">No one is in the room yet.</p>
            )}
          </div>

          <VideoCallPanel
            roomId={activeRoomId}
            accessToken={accessToken}
            socket={socketInstance}
            currentUser={user}
            presenceUsers={presenceUsers}
            disabled={!activeRoomId || socketStatus !== "connected"}
          />

          <RoomChatPanel
            key={activeRoomId || "no-room"}
            roomId={activeRoomId}
            currentUserId={user?.id || ""}
            messages={chatMessages}
            onSendMessage={handleSendChatMessage}
            disabled={!activeRoomId || socketStatus !== "connected"}
          />

          <SpotifyWebPlaybackPanel token={spotifyUserToken} selectedUri={selectedSpotifyUri} />

          <div className="grid gap-5 xl:grid-cols-2">
            <section className="rounded-xl border border-white/10 bg-slate-900/40 backdrop-blur-md p-4">
              <h2 className="text-lg font-semibold">YouTube Search</h2>
              <form className="mt-2 flex gap-2" onSubmit={handleYoutubeSearch}>
                <input
                  value={youtubeQuery}
                  onChange={(event) => setYoutubeQuery(event.target.value)}
                  placeholder="Search YouTube videos..."
                  className="w-full rounded-md border border-white/10 bg-black/30 px-4 py-2.5 text-sm outline-none transition-all focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/50"
                />
                <button type="submit" className="rounded-md bg-amber-500 px-3 py-2 text-sm font-medium text-slate-950">
                  Search
                </button>
              </form>
              <ul className="mt-3 space-y-2">
                {youtubeResults.map((item) => (
                  <li key={item.id} className="rounded-lg border border-white/10 bg-black/20 p-2">
                    <button
                      type="button"
                      onClick={() =>
                        loadSelectedSource(item.url, {
                          poster: item.thumbnail,
                          preferredEngine: "reactplayer",
                          title: item.title,
                        })
                      }
                      className="flex w-full items-center gap-3 text-left"
                    >
                      <img src={item.thumbnail} alt="" className="h-14 w-24 rounded object-cover" />
                      <span className="text-sm">{item.title}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>

            <section className="rounded-xl border border-white/10 bg-slate-900/40 backdrop-blur-md p-4">
              <h2 className="text-lg font-semibold">Spotify Search</h2>
              <form className="mt-2 flex gap-2" onSubmit={handleSpotifySearch}>
                <input
                  value={spotifyQuery}
                  onChange={(event) => setSpotifyQuery(event.target.value)}
                  placeholder="Search tracks/albums/playlists..."
                  className="w-full rounded-md border border-white/10 bg-black/30 px-4 py-2.5 text-sm outline-none transition-all focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/50"
                />
                <button type="submit" className="rounded-md bg-emerald-400 px-3 py-2 text-sm font-medium text-slate-950">
                  Search
                </button>
              </form>
              <ul className="mt-3 space-y-2">
                {spotifyResults.tracks.map((item) => (
                  <li key={item.id} className="rounded-lg border border-white/10 bg-black/20 p-2">
                    <div className="flex items-center gap-3">
                      <img src={item.thumbnail} alt="" className="h-12 w-12 rounded object-cover" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{item.name}</p>
                        <p className="truncate text-xs text-slate-400">{item.artists.join(", ")}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedSpotifyUri(item.uri);
                          loadSelectedSource(item.externalUrl, {
                            preferredEngine: "reactplayer",
                            title: `${item.name} - ${item.artists.join(", ")}`,
                          });
                        }}
                        className="rounded-md border border-emerald-600 px-2 py-1 text-xs font-medium text-emerald-200"
                      >
                        Select
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          </div>

          {statusMessage ? (
            <p className="rounded-md border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-slate-200">
              {statusMessage}
            </p>
          ) : null}
          {socketError ? (
            <p className="rounded-md border border-rose-600/60 bg-rose-950/40 px-3 py-2 text-sm text-rose-200">
              {socketError}
            </p>
          ) : null}
          {isWorking ? <p className="text-xs text-slate-400">Working...</p> : null}
        </div>
      </section>
    </main>
  );
}

export default MediaPage;
