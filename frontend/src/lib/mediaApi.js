import api from "./api";

function authHeaders(token) {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function searchYouTube({ token, q, maxResults = 10 }) {
  const response = await api.get("/media/youtube/search", {
    params: { q, maxResults },
    headers: authHeaders(token),
  });
  return response.data;
}

export async function searchSpotify({ token, q, type = "track,album,playlist", limit = 10 }) {
  const response = await api.get("/media/spotify/search", {
    params: { q, type, limit },
    headers: authHeaders(token),
  });
  return response.data;
}

export async function uploadMedia({ token, file }) {
  const formData = new FormData();
  formData.append("media", file);
  const response = await api.post("/media/upload", formData, {
    headers: {
      ...authHeaders(token),
      "Content-Type": "multipart/form-data",
    },
  });
  return response.data;
}

export async function getSpotifyAuthUrl({ token }) {
  const response = await api.get("/media/spotify/auth-url", {
    headers: authHeaders(token),
  });
  return response.data;
}

export async function exchangeSpotifyCode({ token, code }) {
  const response = await api.post(
    "/media/spotify/token",
    { code },
    {
      headers: authHeaders(token),
    }
  );
  return response.data;
}

export async function refreshSpotifyToken({ token, refreshToken }) {
  const response = await api.post(
    "/media/spotify/refresh",
    { refreshToken },
    {
      headers: authHeaders(token),
    }
  );
  return response.data;
}
