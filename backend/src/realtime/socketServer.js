const { Server } = require("socket.io");
const { createAdapter } = require("@socket.io/redis-adapter");
const { createClient } = require("redis");
const env = require("../config/env");
const { verifyAccessToken } = require("../utils/tokens");
const SyncStateStore = require("./syncStateStore");
const {
  createRoomMessage,
  listRecentRoomMessages,
  validateIncomingMessage,
} = require("../services/chat.service");

function parseSocketOrigins(raw) {
  const list = String(raw || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  return list.length ? list : [env.CLIENT_ORIGIN];
}

function clampNumber(value, min, max, fallbackValue) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return fallbackValue;
  }
  return Math.min(Math.max(numeric, min), max);
}

function normalizeRoomId(roomId) {
  const normalized = String(roomId || "").trim().toLowerCase();
  if (!normalized) {
    return "";
  }
  return normalized.slice(0, 80);
}

function normalizePeerId(peerId) {
  const normalized = String(peerId || "")
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, "");
  if (!normalized) {
    return "";
  }
  return normalized.slice(0, 120);
}

function normalizeVoiceMediaMode(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "audio") {
    return "audio";
  }
  if (normalized === "video") {
    return "video";
  }
  return "audio-video";
}

function getTokenFromSocketHandshake(socket) {
  const authToken = socket.handshake.auth?.token;
  if (authToken) {
    return String(authToken);
  }
  const header = socket.handshake.headers?.authorization;
  if (header?.startsWith("Bearer ")) {
    return header.slice(7);
  }
  return "";
}

function buildPresencePayload(socket) {
  return {
    userId: socket.data.user.userId,
    name: socket.data.user.name,
    email: socket.data.user.email,
    connectedAt: socket.data.connectedAt,
    voicePeerId: socket.data.voicePeerId || "",
    voiceEnabled: Boolean(socket.data.voiceEnabled),
    voiceMedia: socket.data.voiceMedia || "audio-video",
  };
}

async function configureRedis(io) {
  if (!env.REDIS_URL) {
    return {
      mode: "memory",
      kvClient: null,
      close: async () => {},
    };
  }

  let pubClient;
  let subClient;
  let kvClient;

  try {
    pubClient = createClient({ url: env.REDIS_URL });
    subClient = pubClient.duplicate();
    kvClient = pubClient.duplicate();

    const onError = (error) => {
      // eslint-disable-next-line no-console
      console.error("Redis connection error:", error.message);
    };
    pubClient.on("error", onError);
    subClient.on("error", onError);
    kvClient.on("error", onError);

    await Promise.all([pubClient.connect(), subClient.connect(), kvClient.connect()]);
    io.adapter(createAdapter(pubClient, subClient));

    return {
      mode: "redis",
      kvClient,
      close: async () => {
        await Promise.allSettled([pubClient.quit(), subClient.quit(), kvClient.quit()]);
      },
    };
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Redis unavailable, falling back to in-memory sync store:", error.message);
    await Promise.allSettled([
      pubClient?.quit?.(),
      subClient?.quit?.(),
      kvClient?.quit?.(),
    ]);
    return {
      mode: "memory",
      kvClient: null,
      close: async () => {},
    };
  }
}

async function emitPresenceSnapshot(io, store, roomId) {
  const presence = await store.listPresence(roomId);
  io.to(roomId).emit("presence:update", { roomId, users: presence });
}

async function buildRoomSnapshot(store, roomId, historyLimit) {
  const [state, users, messages] = await Promise.all([
    store.getRoomState(roomId),
    store.listPresence(roomId),
    listRecentRoomMessages(roomId, historyLimit),
  ]);

  return {
    roomId,
    state: state || null,
    users,
    chatMessages: messages,
  };
}

function getSocketRoomId(socket, payloadRoomId) {
  const candidate = normalizeRoomId(payloadRoomId || socket.data.roomId);
  if (!candidate) {
    return "";
  }
  if (socket.data.roomId && candidate !== socket.data.roomId) {
    return "";
  }
  return candidate;
}

async function attachSocketServer(httpServer) {
  const io = new Server(httpServer, {
    path: env.SOCKET_PATH,
    cors: {
      origin: parseSocketOrigins(env.SOCKET_CORS_ORIGIN),
      credentials: true,
    },
  });

  const redis = await configureRedis(io);
  const store = new SyncStateStore(redis.kvClient);

  io.use((socket, next) => {
    try {
      const token = getTokenFromSocketHandshake(socket);
      const payload = verifyAccessToken(token);
      socket.data.user = {
        userId: payload.sub,
        email: payload.email || "",
        name: payload.name || "User",
      };
      socket.data.connectedAt = new Date().toISOString();
      socket.data.roomId = "";
      socket.data.voicePeerId = "";
      socket.data.voiceEnabled = false;
      socket.data.voiceMedia = "audio-video";
      return next();
    } catch {
      return next(new Error("UNAUTHORIZED"));
    }
  });

  io.on("connection", (socket) => {
    socket.emit("sync:connected", {
      socketId: socket.id,
      user: socket.data.user,
    });

    socket.on("room:join", async (payload = {}, ack) => {
      try {
        const roomId = normalizeRoomId(payload.roomId);
        if (!roomId) {
          if (typeof ack === "function") {
            ack({ ok: false, message: "roomId is required" });
          }
          return;
        }

        if (socket.data.roomId && socket.data.roomId !== roomId) {
          await store.removePresence(socket.data.roomId, socket.id);
          socket.leave(socket.data.roomId);
          await emitPresenceSnapshot(io, store, socket.data.roomId);
        }

        socket.join(roomId);
        socket.data.roomId = roomId;
        await store.upsertPresence(roomId, socket.id, buildPresencePayload(socket));

        const snapshot = await buildRoomSnapshot(store, roomId, payload.historyLimit);
        socket.emit("room:snapshot", snapshot);
        await emitPresenceSnapshot(io, store, roomId);

        if (typeof ack === "function") {
          ack({ ok: true, roomId });
        }
      } catch (error) {
        if (typeof ack === "function") {
          ack({ ok: false, message: error.message || "Failed to join room" });
        }
      }
    });

    socket.on("room:leave", async (payload = {}, ack) => {
      const roomId = getSocketRoomId(socket, payload.roomId);
      if (!roomId) {
        if (typeof ack === "function") {
          ack({ ok: false, message: "Not in room" });
        }
        return;
      }

      await store.removePresence(roomId, socket.id);
      socket.leave(roomId);
      socket.data.roomId = "";
      await emitPresenceSnapshot(io, store, roomId);

      if (typeof ack === "function") {
        ack({ ok: true });
      }
    });

    socket.on("sync:state-request", async (payload = {}, ack) => {
      const roomId = getSocketRoomId(socket, payload.roomId);
      if (!roomId) {
        if (typeof ack === "function") {
          ack({ ok: false, message: "Not in room" });
        }
        return;
      }

      const snapshot = await buildRoomSnapshot(store, roomId, payload.historyLimit);
      socket.emit("room:snapshot", snapshot);

      if (typeof ack === "function") {
        ack({ ok: true, ...snapshot });
      }
    });

    socket.on("chat:history-request", async (payload = {}, ack) => {
      const roomId = getSocketRoomId(socket, payload.roomId);
      if (!roomId) {
        if (typeof ack === "function") {
          ack({ ok: false, message: "Not in room" });
        }
        return;
      }

      try {
        const messages = await listRecentRoomMessages(roomId, payload.limit);
        socket.emit("chat:history", { roomId, messages });
        if (typeof ack === "function") {
          ack({ ok: true, messages });
        }
      } catch (error) {
        if (typeof ack === "function") {
          ack({ ok: false, message: error.message || "Failed to fetch chat history" });
        }
      }
    });

    socket.on("chat:send", async (payload = {}, ack) => {
      const roomId = getSocketRoomId(socket, payload.roomId);
      if (!roomId) {
        if (typeof ack === "function") {
          ack({ ok: false, message: "Not in room" });
        }
        return;
      }

      const validation = validateIncomingMessage(payload);
      if (!validation.ok) {
        if (typeof ack === "function") {
          ack({ ok: false, message: validation.message });
        }
        return;
      }

      try {
        const message = await createRoomMessage({
          roomId,
          userId: socket.data.user.userId,
          messageType: validation.messageType,
          text: validation.text,
          gifUrl: validation.gifUrl,
        });

        io.to(roomId).emit("chat:new", { roomId, message });
        if (typeof ack === "function") {
          ack({ ok: true, message });
        }
      } catch (error) {
        if (typeof ack === "function") {
          ack({ ok: false, message: error.message || "Failed to send message" });
        }
      }
    });

    socket.on("webrtc:announce", async (payload = {}, ack) => {
      const roomId = getSocketRoomId(socket, payload.roomId);
      if (!roomId) {
        if (typeof ack === "function") {
          ack({ ok: false, message: "Not in room" });
        }
        return;
      }

      const peerId = normalizePeerId(payload.peerId);
      if (!peerId) {
        if (typeof ack === "function") {
          ack({ ok: false, message: "Valid peerId is required" });
        }
        return;
      }

      socket.data.voicePeerId = peerId;
      socket.data.voiceEnabled = true;
      socket.data.voiceMedia = normalizeVoiceMediaMode(payload.media);
      await store.upsertPresence(roomId, socket.id, buildPresencePayload(socket));
      await emitPresenceSnapshot(io, store, roomId);
      io.to(roomId).emit("webrtc:peer-announced", {
        roomId,
        userId: socket.data.user.userId,
        peerId,
        media: socket.data.voiceMedia,
      });

      if (typeof ack === "function") {
        ack({ ok: true, peerId, media: socket.data.voiceMedia });
      }
    });

    socket.on("webrtc:update-media", async (payload = {}, ack) => {
      const roomId = getSocketRoomId(socket, payload.roomId);
      if (!roomId) {
        if (typeof ack === "function") {
          ack({ ok: false, message: "Not in room" });
        }
        return;
      }

      if (!socket.data.voicePeerId) {
        if (typeof ack === "function") {
          ack({ ok: false, message: "Announce peerId before updating media" });
        }
        return;
      }

      socket.data.voiceMedia = normalizeVoiceMediaMode(payload.media);
      await store.upsertPresence(roomId, socket.id, buildPresencePayload(socket));
      await emitPresenceSnapshot(io, store, roomId);

      if (typeof ack === "function") {
        ack({ ok: true, media: socket.data.voiceMedia });
      }
    });

    socket.on("webrtc:clear", async (payload = {}, ack) => {
      const roomId = getSocketRoomId(socket, payload.roomId);
      if (!roomId) {
        if (typeof ack === "function") {
          ack({ ok: false, message: "Not in room" });
        }
        return;
      }

      socket.data.voicePeerId = "";
      socket.data.voiceEnabled = false;
      socket.data.voiceMedia = "audio-video";
      await store.upsertPresence(roomId, socket.id, buildPresencePayload(socket));
      await emitPresenceSnapshot(io, store, roomId);
      io.to(roomId).emit("webrtc:peer-cleared", {
        roomId,
        userId: socket.data.user.userId,
      });

      if (typeof ack === "function") {
        ack({ ok: true });
      }
    });

    socket.on("sync:source-change", async (payload = {}, ack) => {
      const roomId = getSocketRoomId(socket, payload.roomId);
      if (!roomId) {
        if (typeof ack === "function") {
          ack({ ok: false, message: "Not in room" });
        }
        return;
      }

      const nextState = await store.updateRoomState(roomId, {
        sourceUrl: String(payload.url || ""),
        sourcePoster: String(payload.poster || ""),
        sourceTitle: String(payload.title || ""),
        playerEngine: String(payload.playerEngine || "reactplayer"),
        positionSeconds: clampNumber(payload.positionSeconds, 0, 86_400, 0),
        isPlaying: Boolean(payload.isPlaying),
        isBuffering: false,
        playbackRate: clampNumber(payload.playbackRate, 0.25, 2, 1),
        updatedByUserId: socket.data.user.userId,
      });

      socket.to(roomId).emit("sync:source-change", { roomId, state: nextState });
      if (typeof ack === "function") {
        ack({ ok: true, state: nextState });
      }
    });

    socket.on("sync:play", async (payload = {}, ack) => {
      const roomId = getSocketRoomId(socket, payload.roomId);
      if (!roomId) {
        return;
      }
      const nextState = await store.updateRoomState(roomId, {
        isPlaying: true,
        isBuffering: false,
        positionSeconds: clampNumber(payload.positionSeconds, 0, 86_400, 0),
        updatedByUserId: socket.data.user.userId,
      });
      socket.to(roomId).emit("sync:play", { roomId, state: nextState });
      if (typeof ack === "function") {
        ack({ ok: true });
      }
    });

    socket.on("sync:pause", async (payload = {}, ack) => {
      const roomId = getSocketRoomId(socket, payload.roomId);
      if (!roomId) {
        return;
      }
      const nextState = await store.updateRoomState(roomId, {
        isPlaying: false,
        positionSeconds: clampNumber(payload.positionSeconds, 0, 86_400, 0),
        updatedByUserId: socket.data.user.userId,
      });
      socket.to(roomId).emit("sync:pause", { roomId, state: nextState });
      if (typeof ack === "function") {
        ack({ ok: true });
      }
    });

    socket.on("sync:seek", async (payload = {}, ack) => {
      const roomId = getSocketRoomId(socket, payload.roomId);
      if (!roomId) {
        return;
      }
      const nextState = await store.updateRoomState(roomId, {
        positionSeconds: clampNumber(payload.positionSeconds, 0, 86_400, 0),
        updatedByUserId: socket.data.user.userId,
      });
      socket.to(roomId).emit("sync:seek", { roomId, state: nextState });
      if (typeof ack === "function") {
        ack({ ok: true });
      }
    });

    socket.on("sync:buffer", async (payload = {}, ack) => {
      const roomId = getSocketRoomId(socket, payload.roomId);
      if (!roomId) {
        return;
      }
      const nextState = await store.updateRoomState(roomId, {
        isBuffering: Boolean(payload.isBuffering),
        updatedByUserId: socket.data.user.userId,
      });
      socket.to(roomId).emit("sync:buffer", { roomId, state: nextState });
      if (typeof ack === "function") {
        ack({ ok: true });
      }
    });

    socket.on("sync:rate-change", async (payload = {}, ack) => {
      const roomId = getSocketRoomId(socket, payload.roomId);
      if (!roomId) {
        return;
      }
      const nextState = await store.updateRoomState(roomId, {
        playbackRate: clampNumber(payload.playbackRate, 0.25, 2, 1),
        updatedByUserId: socket.data.user.userId,
      });
      socket.to(roomId).emit("sync:rate-change", { roomId, state: nextState });
      if (typeof ack === "function") {
        ack({ ok: true });
      }
    });

    socket.on("disconnect", async () => {
      const roomId = socket.data.roomId;
      if (!roomId) {
        return;
      }
      await store.removePresence(roomId, socket.id);
      await emitPresenceSnapshot(io, store, roomId);
    });
  });

  io.engine.on("connection_error", (error) => {
    // eslint-disable-next-line no-console
    console.error("Socket connection error:", error.message);
  });

  return {
    io,
    redisMode: redis.mode,
    close: redis.close,
  };
}

module.exports = attachSocketServer;
