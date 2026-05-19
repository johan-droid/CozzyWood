const path = require("node:path");
const express = require("express");
const multer = require("multer");
const env = require("../config/env");
const requireAuth = require("../middleware/requireAuth");
const { searchYouTube } = require("../services/youtube.service");
const {
  searchSpotify,
  getSpotifyAuthUrl,
  exchangeSpotifyCode,
  refreshSpotifyUserToken,
} = require("../services/spotify.service");
const { buildMediaKey, storeMedia } = require("../services/storage.service");
const { transcodeVideoBufferToMp4 } = require("../services/transcode.service");

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: env.MAX_UPLOAD_MB * 1024 * 1024,
  },
});

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function toAbsoluteUrl(req, urlPath) {
  if (urlPath.startsWith("http://") || urlPath.startsWith("https://")) {
    return urlPath;
  }
  return `${req.protocol}://${req.get("host")}${urlPath}`;
}

router.get("/youtube/search", requireAuth, async (req, res) => {
  try {
    const q = String(req.query.q || "").trim();
    const maxResults = clamp(Number(req.query.maxResults || 10), 1, 25);
    if (!q) {
      return res.status(400).json({ message: "Query parameter q is required" });
    }

    const payload = await searchYouTube({ q, maxResults });
    const videos = (payload.items || []).map((item) => ({
      id: item.id?.videoId,
      title: item.snippet?.title,
      description: item.snippet?.description,
      channelTitle: item.snippet?.channelTitle,
      publishedAt: item.snippet?.publishedAt,
      thumbnail: item.snippet?.thumbnails?.medium?.url || item.snippet?.thumbnails?.default?.url,
      url: item.id?.videoId ? `https://www.youtube.com/watch?v=${item.id.videoId}` : "",
    }));

    return res.json({ items: videos });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ message: error.message || "YouTube search failed" });
  }
});

router.get("/spotify/search", requireAuth, async (req, res) => {
  try {
    const q = String(req.query.q || "").trim();
    const type = String(req.query.type || "track,album,playlist");
    const limit = clamp(Number(req.query.limit || 10), 1, 25);
    if (!q) {
      return res.status(400).json({ message: "Query parameter q is required" });
    }

    const payload = await searchSpotify({ q, type, limit });
    const tracks = (payload.tracks?.items || []).map((track) => ({
      id: track.id,
      name: track.name,
      artists: (track.artists || []).map((artist) => artist.name),
      album: track.album?.name,
      thumbnail: track.album?.images?.[1]?.url || track.album?.images?.[0]?.url,
      externalUrl: track.external_urls?.spotify,
      uri: track.uri,
    }));
    const albums = (payload.albums?.items || []).map((album) => ({
      id: album.id,
      name: album.name,
      artists: (album.artists || []).map((artist) => artist.name),
      thumbnail: album.images?.[1]?.url || album.images?.[0]?.url,
      externalUrl: album.external_urls?.spotify,
      uri: album.uri,
    }));
    const playlists = (payload.playlists?.items || []).map((playlist) => ({
      id: playlist.id,
      name: playlist.name,
      owner: playlist.owner?.display_name,
      thumbnail: playlist.images?.[1]?.url || playlist.images?.[0]?.url,
      externalUrl: playlist.external_urls?.spotify,
      uri: playlist.uri,
    }));

    return res.json({ tracks, albums, playlists });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ message: error.message || "Spotify search failed" });
  }
});

router.get("/spotify/config", requireAuth, (_req, res) => {
  return res.json({
    clientId: env.SPOTIFY_CLIENT_ID || "",
    redirectUri: env.SPOTIFY_REDIRECT_URI || "",
  });
});

router.get("/spotify/auth-url", requireAuth, (_req, res) => {
  try {
    const payload = getSpotifyAuthUrl();
    return res.json(payload);
  } catch (error) {
    return res.status(error.statusCode || 500).json({ message: error.message || "Failed to build auth URL" });
  }
});

router.post("/spotify/token", requireAuth, async (req, res) => {
  try {
    const code = String(req.body?.code || "").trim();
    if (!code) {
      return res.status(400).json({ message: "Spotify code is required" });
    }
    const payload = await exchangeSpotifyCode(code);
    return res.json(payload);
  } catch (error) {
    return res.status(error.statusCode || 500).json({ message: error.message || "Spotify code exchange failed" });
  }
});

router.post("/spotify/refresh", requireAuth, async (req, res) => {
  try {
    const refreshToken = String(req.body?.refreshToken || "").trim();
    if (!refreshToken) {
      return res.status(400).json({ message: "refreshToken is required" });
    }
    const payload = await refreshSpotifyUserToken(refreshToken);
    return res.json(payload);
  } catch (error) {
    return res.status(error.statusCode || 500).json({ message: error.message || "Spotify refresh failed" });
  }
});

router.post("/upload", requireAuth, upload.single("media"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No media file provided. Use form-data key 'media'" });
    }

    let output = {
      buffer: req.file.buffer,
      mimetype: req.file.mimetype,
      fileName: req.file.originalname,
    };

    if (env.ENABLE_TRANSCODE && req.file.mimetype.startsWith("video/")) {
      const transcoded = await transcodeVideoBufferToMp4(req.file.buffer);
      const baseName = path.parse(req.file.originalname).name;
      output = {
        buffer: transcoded.buffer,
        mimetype: transcoded.mimetype,
        fileName: `${baseName}${transcoded.extension}`,
      };
    }

    const key = buildMediaKey(req.auth.userId, output.fileName);
    const stored = await storeMedia({
      key,
      buffer: output.buffer,
      mimetype: output.mimetype,
    });

    return res.status(201).json({
      key: stored.key,
      storage: stored.storage,
      url: toAbsoluteUrl(req, stored.url),
      mimetype: output.mimetype,
      size: output.buffer.length,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ message: error.message || "Media upload failed" });
  }
});

module.exports = router;
