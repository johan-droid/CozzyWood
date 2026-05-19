const env = require("../config/env");

const memoryRoomState = new Map();
const memoryRoomPresence = new Map();

function getStateKey(roomId) {
  return `sync:room:${roomId}:state`;
}

function getPresenceKey(roomId) {
  return `sync:room:${roomId}:presence`;
}

function safeParse(raw, fallbackValue) {
  if (!raw) {
    return fallbackValue;
  }
  try {
    return JSON.parse(raw);
  } catch {
    return fallbackValue;
  }
}

class SyncStateStore {
  constructor(redisClient = null) {
    this.redisClient = redisClient;
  }

  async getRoomState(roomId) {
    if (!this.redisClient) {
      return memoryRoomState.get(roomId) || null;
    }

    const raw = await this.redisClient.get(getStateKey(roomId));
    return safeParse(raw, null);
  }

  async updateRoomState(roomId, patch) {
    const previous = (await this.getRoomState(roomId)) || {};
    const next = {
      ...previous,
      ...patch,
      roomId,
      updatedAt: new Date().toISOString(),
    };

    if (!this.redisClient) {
      memoryRoomState.set(roomId, next);
      return next;
    }

    await this.redisClient.set(getStateKey(roomId), JSON.stringify(next), {
      EX: env.SYNC_STATE_TTL_SECONDS,
    });
    return next;
  }

  async upsertPresence(roomId, socketId, presence) {
    const value = JSON.stringify({
      ...presence,
      socketId,
      roomId,
      updatedAt: new Date().toISOString(),
    });

    if (!this.redisClient) {
      if (!memoryRoomPresence.has(roomId)) {
        memoryRoomPresence.set(roomId, new Map());
      }
      memoryRoomPresence.get(roomId).set(socketId, value);
      return;
    }

    await this.redisClient.hSet(getPresenceKey(roomId), socketId, value);
    await this.redisClient.expire(getPresenceKey(roomId), env.SYNC_PRESENCE_TTL_SECONDS);
  }

  async removePresence(roomId, socketId) {
    if (!this.redisClient) {
      const map = memoryRoomPresence.get(roomId);
      if (!map) {
        return;
      }
      map.delete(socketId);
      if (map.size === 0) {
        memoryRoomPresence.delete(roomId);
      }
      return;
    }

    await this.redisClient.hDel(getPresenceKey(roomId), socketId);
  }

  async listPresence(roomId) {
    if (!this.redisClient) {
      const map = memoryRoomPresence.get(roomId);
      if (!map) {
        return [];
      }
      return Array.from(map.values())
        .map((value) => safeParse(value, null))
        .filter(Boolean);
    }

    const values = await this.redisClient.hVals(getPresenceKey(roomId));
    return values.map((value) => safeParse(value, null)).filter(Boolean);
  }
}

module.exports = SyncStateStore;
