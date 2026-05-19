import api from "./api";

function authHeaders(token) {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function getWebRtcConfig({ token, provider = "", ttlSeconds } = {}) {
  const response = await api.get("/webrtc/config", {
    headers: authHeaders(token),
    params: {
      provider: provider || undefined,
      ttlSeconds: ttlSeconds || undefined,
    },
  });
  return response.data;
}

export async function getIceServers({ token, provider = "", ttlSeconds } = {}) {
  const response = await api.get("/webrtc/ice-servers", {
    headers: authHeaders(token),
    params: {
      provider: provider || undefined,
      ttlSeconds: ttlSeconds || undefined,
    },
  });
  return response.data;
}
