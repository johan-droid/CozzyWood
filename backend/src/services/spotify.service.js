const crypto = require("node:crypto");
const env = require("../config/env");

let cachedClientToken = null;
let cachedClientTokenExpiresAt = 0;

function ensureSpotifyCredentials() {
  if (!env.SPOTIFY_CLIENT_ID || !env.SPOTIFY_CLIENT_SECRET) {
    const error = new Error("Spotify credentials are missing. Set SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET.");
    error.statusCode = 500;
    throw error;
  }
}

async function parseResponse(response) {
  const text = await response.text();
  if (!text) {
    return {};
  }
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

async function getSpotifyClientAccessToken() {
  ensureSpotifyCredentials();

  if (cachedClientToken && Date.now() < cachedClientTokenExpiresAt - 30_000) {
    return cachedClientToken;
  }

  const body = new URLSearchParams({ grant_type: "client_credentials" });
  const basicAuth = Buffer.from(`${env.SPOTIFY_CLIENT_ID}:${env.SPOTIFY_CLIENT_SECRET}`).toString("base64");

  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${basicAuth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });
  const payload = await parseResponse(response);

  if (!response.ok) {
    const error = new Error(payload.error_description || payload.error || "Spotify token request failed");
    error.statusCode = response.status;
    throw error;
  }

  cachedClientToken = payload.access_token;
  cachedClientTokenExpiresAt = Date.now() + Number(payload.expires_in || 0) * 1000;
  return cachedClientToken;
}

async function searchSpotify({ q, type = "track,album,playlist", limit = 10 }) {
  const token = await getSpotifyClientAccessToken();
  const search = new URLSearchParams({
    q,
    type,
    limit: String(limit),
    market: "US",
  });

  const response = await fetch(`https://api.spotify.com/v1/search?${search.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const payload = await parseResponse(response);

  if (!response.ok) {
    const error = new Error(payload.error?.message || "Spotify search failed");
    error.statusCode = response.status;
    throw error;
  }

  return payload;
}

function getSpotifyAuthUrl() {
  ensureSpotifyCredentials();
  if (!env.SPOTIFY_REDIRECT_URI) {
    const error = new Error("SPOTIFY_REDIRECT_URI is not configured");
    error.statusCode = 500;
    throw error;
  }

  const state = crypto.randomBytes(16).toString("hex");
  const params = new URLSearchParams({
    response_type: "code",
    client_id: env.SPOTIFY_CLIENT_ID,
    redirect_uri: env.SPOTIFY_REDIRECT_URI,
    scope: "streaming user-read-email user-read-private user-modify-playback-state user-read-playback-state",
    state,
  });
  return {
    state,
    url: `https://accounts.spotify.com/authorize?${params.toString()}`,
  };
}

async function exchangeSpotifyCode(code) {
  ensureSpotifyCredentials();
  if (!env.SPOTIFY_REDIRECT_URI) {
    const error = new Error("SPOTIFY_REDIRECT_URI is not configured");
    error.statusCode = 500;
    throw error;
  }

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: env.SPOTIFY_REDIRECT_URI,
  });
  const basicAuth = Buffer.from(`${env.SPOTIFY_CLIENT_ID}:${env.SPOTIFY_CLIENT_SECRET}`).toString("base64");

  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${basicAuth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });
  const payload = await parseResponse(response);

  if (!response.ok) {
    const error = new Error(payload.error_description || payload.error || "Spotify code exchange failed");
    error.statusCode = response.status;
    throw error;
  }

  return payload;
}

async function refreshSpotifyUserToken(refreshToken) {
  ensureSpotifyCredentials();

  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });
  const basicAuth = Buffer.from(`${env.SPOTIFY_CLIENT_ID}:${env.SPOTIFY_CLIENT_SECRET}`).toString("base64");

  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${basicAuth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });
  const payload = await parseResponse(response);

  if (!response.ok) {
    const error = new Error(payload.error_description || payload.error || "Spotify refresh failed");
    error.statusCode = response.status;
    throw error;
  }

  return payload;
}

module.exports = {
  searchSpotify,
  getSpotifyAuthUrl,
  exchangeSpotifyCode,
  refreshSpotifyUserToken,
};
