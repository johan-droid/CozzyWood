const env = require("../config/env");
const prisma = require("../lib/prisma");

function clampNumber(value, min, max, fallbackValue) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return fallbackValue;
  }
  return Math.min(Math.max(numeric, min), max);
}

function toMessageType(value) {
  const normalized = String(value || "TEXT").trim().toUpperCase();
  return normalized === "GIF" ? "GIF" : "TEXT";
}

function sanitizeText(value) {
  const normalized = String(value || "").replace(/\s+/g, " ").trim();
  return normalized.slice(0, env.CHAT_MAX_MESSAGE_LENGTH);
}

function sanitizeGifUrl(value) {
  const url = String(value || "").trim();
  if (!url) {
    return "";
  }
  if (!/^https?:\/\//i.test(url)) {
    return "";
  }
  return url.slice(0, 2048);
}

function toPublicChatMessage(message) {
  return {
    id: message.id,
    roomId: message.roomId,
    userId: message.userId,
    messageType: message.messageType,
    text: message.text,
    gifUrl: message.gifUrl || "",
    createdAt: message.createdAt,
    user: {
      id: message.user.id,
      name: message.user.name,
      email: message.user.email,
    },
  };
}

function validateIncomingMessage(payload = {}) {
  const messageType = toMessageType(payload.messageType);
  const text = sanitizeText(payload.text);
  const gifUrl = sanitizeGifUrl(payload.gifUrl);

  if (messageType === "GIF" && !gifUrl) {
    return { ok: false, message: "Valid gifUrl is required for GIF messages" };
  }

  if (messageType === "TEXT" && !text) {
    return { ok: false, message: "Message text is required" };
  }

  return {
    ok: true,
    messageType,
    text,
    gifUrl,
  };
}

async function listRecentRoomMessages(roomId, rawLimit) {
  const limit = clampNumber(rawLimit, 1, 200, env.CHAT_HISTORY_LIMIT);
  try {
    const rows = await prisma.chatMessage.findMany({
      where: { roomId },
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return rows.reverse().map(toPublicChatMessage);
  } catch (error) {
    if (error?.code === "P2021" || error?.code === "P2022") {
      return [];
    }
    throw error;
  }
}

async function createRoomMessage({ roomId, userId, messageType, text, gifUrl }) {
  try {
    const row = await prisma.chatMessage.create({
      data: {
        roomId,
        userId,
        messageType,
        text,
        gifUrl: gifUrl || null,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return toPublicChatMessage(row);
  } catch (error) {
    if (error?.code === "P2021" || error?.code === "P2022") {
      const chatSchemaError = new Error("Chat schema is not applied yet. Run Phase 4 DB migration.");
      chatSchemaError.statusCode = 500;
      throw chatSchemaError;
    }
    throw error;
  }
}

module.exports = {
  createRoomMessage,
  listRecentRoomMessages,
  validateIncomingMessage,
};
