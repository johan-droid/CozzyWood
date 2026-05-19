const env = require("../config/env");

const DEFAULT_STUN_URL = "stun:stun.l.google.com:19302";

function normalizeIceServerEntry(entry) {
  if (!entry) {
    return null;
  }

  if (typeof entry === "string") {
    const url = entry.trim();
    if (!url) {
      return null;
    }
    return { urls: [url] };
  }

  if (typeof entry !== "object") {
    return null;
  }

  const urls = Array.isArray(entry.urls)
    ? entry.urls.map((url) => String(url || "").trim()).filter(Boolean)
    : String(entry.urls || "")
        .split(",")
        .map((url) => url.trim())
        .filter(Boolean);

  if (!urls.length) {
    return null;
  }

  const normalized = { urls };
  if (entry.username) {
    normalized.username = String(entry.username);
  }
  if (entry.credential) {
    normalized.credential = String(entry.credential);
  }
  return normalized;
}

function uniqueIceServers(entries) {
  const dedupe = new Map();
  entries.forEach((entry) => {
    const normalized = normalizeIceServerEntry(entry);
    if (!normalized) {
      return;
    }
    const key = JSON.stringify(normalized);
    dedupe.set(key, normalized);
  });
  return Array.from(dedupe.values());
}

function getStunServers() {
  const urls = String(env.WEBRTC_STUN_URLS || DEFAULT_STUN_URL)
    .split(",")
    .map((url) => url.trim())
    .filter(Boolean);

  return uniqueIceServers(urls);
}

function getCustomIceServers() {
  if (!env.WEBRTC_ICE_SERVERS_JSON) {
    return [];
  }

  let parsed;
  try {
    parsed = JSON.parse(env.WEBRTC_ICE_SERVERS_JSON);
  } catch {
    const error = new Error("WEBRTC_ICE_SERVERS_JSON is not valid JSON");
    error.statusCode = 500;
    throw error;
  }

  if (!Array.isArray(parsed)) {
    const error = new Error("WEBRTC_ICE_SERVERS_JSON must be an array");
    error.statusCode = 500;
    throw error;
  }

  return uniqueIceServers(parsed);
}

function getMeteredIceServers() {
  const turnUrls = String(env.METERED_TURN_URLS || "")
    .split(",")
    .map((url) => url.trim())
    .filter(Boolean);

  if (!turnUrls.length || !env.METERED_TURN_USERNAME || !env.METERED_TURN_CREDENTIAL) {
    const error = new Error("Metered TURN is not configured");
    error.statusCode = 400;
    throw error;
  }

  return uniqueIceServers([
    ...getStunServers(),
    {
      urls: turnUrls,
      username: env.METERED_TURN_USERNAME,
      credential: env.METERED_TURN_CREDENTIAL,
    },
  ]);
}

function clampTtl(rawValue) {
  const numeric = Number(rawValue || env.WEBRTC_ICE_TTL_SECONDS || 3600);
  if (!Number.isFinite(numeric)) {
    return 3600;
  }
  return Math.min(Math.max(Math.floor(numeric), 60), 86400);
}

async function getTwilioIceServers(ttlSeconds) {
  if (!env.TWILIO_ACCOUNT_SID || !env.TWILIO_AUTH_TOKEN) {
    const error = new Error("Twilio TURN credentials are not configured");
    error.statusCode = 400;
    throw error;
  }

  const accountSid = encodeURIComponent(env.TWILIO_ACCOUNT_SID);
  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Tokens.json`;
  const body = new URLSearchParams({ Ttl: String(clampTtl(ttlSeconds)) });
  const authValue = Buffer.from(`${env.TWILIO_ACCOUNT_SID}:${env.TWILIO_AUTH_TOKEN}`).toString("base64");

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Basic ${authValue}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  if (!response.ok) {
    const payload = await response.text();
    const error = new Error(`Twilio token request failed (${response.status}): ${payload}`);
    error.statusCode = 502;
    throw error;
  }

  const payload = await response.json();
  return uniqueIceServers(payload.ice_servers || []);
}

function normalizePeerPath(pathValue) {
  const raw = String(pathValue || "").trim();
  if (!raw) {
    return "/peerjs";
  }
  return raw.startsWith("/") ? raw : `/${raw}`;
}

function buildPeerServerClientConfig(req) {
  const configuredUrl = String(env.PEER_SERVER_URL || "").trim();
  const path = normalizePeerPath(env.PEER_SERVER_PATH);
  let secure = req.protocol === "https";
  let host = req.hostname;
  let port;

  if (configuredUrl) {
    const parsed = new URL(configuredUrl);
    secure = parsed.protocol === "https:";
    host = parsed.hostname;
    port = parsed.port ? Number(parsed.port) : undefined;
  }

  const config = {
    host,
    secure,
    path,
    key: env.PEER_SERVER_KEY,
  };

  if (port) {
    config.port = port;
  }

  return config;
}

async function resolveIceServers({ provider, ttlSeconds } = {}) {
  const selectedProvider = String(provider || env.WEBRTC_ICE_PROVIDER || "stun").toLowerCase();
  switch (selectedProvider) {
    case "twilio":
      return {
        provider: "twilio",
        iceServers: await getTwilioIceServers(ttlSeconds),
      };
    case "metered":
      return {
        provider: "metered",
        iceServers: getMeteredIceServers(),
      };
    case "custom":
      return {
        provider: "custom",
        iceServers: uniqueIceServers([...getStunServers(), ...getCustomIceServers()]),
      };
    case "stun":
    default:
      return {
        provider: "stun",
        iceServers: getStunServers(),
      };
  }
}

module.exports = {
  buildPeerServerClientConfig,
  resolveIceServers,
};
