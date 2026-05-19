function parseBoolean(value, defaultValue = false) {
  if (value === undefined) {
    return defaultValue;
  }
  return String(value).toLowerCase() === "true";
}

function parseNumber(value, fallbackValue) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return fallbackValue;
  }
  return numeric;
}

const env = {
  PORT: parseNumber(process.env.PORT, 4000),
  NODE_ENV: process.env.NODE_ENV || "development",
  CLIENT_ORIGIN: process.env.CLIENT_ORIGIN || "http://localhost:5173",
  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET || "replace-me-access-secret",
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || "replace-me-refresh-secret",
  ACCESS_TOKEN_TTL: process.env.ACCESS_TOKEN_TTL || "15m",
  REFRESH_TOKEN_TTL_DAYS: parseNumber(process.env.REFRESH_TOKEN_TTL_DAYS, 7),
  MAX_USERS: parseNumber(process.env.MAX_USERS, 2),
  YOUTUBE_API_KEY: process.env.YOUTUBE_API_KEY || "",
  SPOTIFY_CLIENT_ID: process.env.SPOTIFY_CLIENT_ID || "",
  SPOTIFY_CLIENT_SECRET: process.env.SPOTIFY_CLIENT_SECRET || "",
  SPOTIFY_REDIRECT_URI: process.env.SPOTIFY_REDIRECT_URI || "",
  MEDIA_STORAGE: process.env.MEDIA_STORAGE || "local",
  MAX_UPLOAD_MB: parseNumber(process.env.MAX_UPLOAD_MB, 200),
  ENABLE_TRANSCODE: parseBoolean(process.env.ENABLE_TRANSCODE, false),
  FFMPEG_PATH: process.env.FFMPEG_PATH || "ffmpeg",
  S3_REGION: process.env.S3_REGION || "auto",
  S3_ENDPOINT: process.env.S3_ENDPOINT || "",
  S3_BUCKET: process.env.S3_BUCKET || "",
  S3_ACCESS_KEY_ID: process.env.S3_ACCESS_KEY_ID || "",
  S3_SECRET_ACCESS_KEY: process.env.S3_SECRET_ACCESS_KEY || "",
  S3_PUBLIC_BASE_URL: process.env.S3_PUBLIC_BASE_URL || "",
  REDIS_URL: process.env.REDIS_URL || "",
  SOCKET_CORS_ORIGIN: process.env.SOCKET_CORS_ORIGIN || process.env.CLIENT_ORIGIN || "http://localhost:5173",
  SOCKET_PATH: process.env.SOCKET_PATH || "/socket.io",
  SYNC_STATE_TTL_SECONDS: parseNumber(process.env.SYNC_STATE_TTL_SECONDS, 86400),
  SYNC_PRESENCE_TTL_SECONDS: parseNumber(process.env.SYNC_PRESENCE_TTL_SECONDS, 3600),
  CHAT_HISTORY_LIMIT: parseNumber(process.env.CHAT_HISTORY_LIMIT, 50),
  CHAT_MAX_MESSAGE_LENGTH: parseNumber(process.env.CHAT_MAX_MESSAGE_LENGTH, 1200),
  PEER_SERVER_PATH: process.env.PEER_SERVER_PATH || "/peerjs",
  PEER_SERVER_KEY: process.env.PEER_SERVER_KEY || "peerjs",
  PEER_SERVER_URL: process.env.PEER_SERVER_URL || "",
  PEER_SERVER_PROXIED: parseBoolean(process.env.PEER_SERVER_PROXIED, true),
  PEER_SERVER_ALLOW_DISCOVERY: parseBoolean(process.env.PEER_SERVER_ALLOW_DISCOVERY, false),
  PEER_SERVER_CONCURRENT_LIMIT: parseNumber(process.env.PEER_SERVER_CONCURRENT_LIMIT, 5000),
  PEER_SERVER_ALIVE_TIMEOUT_MS: parseNumber(process.env.PEER_SERVER_ALIVE_TIMEOUT_MS, 60000),
  PEER_SERVER_EXPIRE_TIMEOUT_MS: parseNumber(process.env.PEER_SERVER_EXPIRE_TIMEOUT_MS, 5000),
  WEBRTC_ICE_PROVIDER: process.env.WEBRTC_ICE_PROVIDER || "stun",
  WEBRTC_STUN_URLS: process.env.WEBRTC_STUN_URLS || "stun:stun.l.google.com:19302",
  WEBRTC_ICE_TTL_SECONDS: parseNumber(process.env.WEBRTC_ICE_TTL_SECONDS, 3600),
  WEBRTC_ICE_SERVERS_JSON: process.env.WEBRTC_ICE_SERVERS_JSON || "",
  TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID || "",
  TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN || "",
  METERED_TURN_URLS: process.env.METERED_TURN_URLS || "",
  METERED_TURN_USERNAME: process.env.METERED_TURN_USERNAME || "",
  METERED_TURN_CREDENTIAL: process.env.METERED_TURN_CREDENTIAL || "",
};

module.exports = env;
