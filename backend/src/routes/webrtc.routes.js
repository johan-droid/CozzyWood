const crypto = require("node:crypto");
const express = require("express");
const requireAuth = require("../middleware/requireAuth");
const {
  buildPeerServerClientConfig,
  resolveIceServers,
} = require("../services/webrtc.service");

const router = express.Router();

function buildRecommendedPeerId(userId) {
  const safeUserId = String(userId || "user")
    .replace(/[^a-zA-Z0-9_-]/g, "")
    .slice(0, 24) || "user";
  const suffix = crypto.randomUUID().replace(/-/g, "").slice(0, 12);
  return `cw-${safeUserId}-${suffix}`;
}

router.get("/config", requireAuth, async (req, res) => {
  try {
    const provider = String(req.query.provider || "").trim().toLowerCase();
    const ttlSeconds = req.query.ttlSeconds;
    const iceResult = await resolveIceServers({ provider, ttlSeconds });
    const peerServer = buildPeerServerClientConfig(req);
    return res.json({
      peerServer,
      iceProvider: iceResult.provider,
      iceServers: iceResult.iceServers,
      recommendedPeerId: buildRecommendedPeerId(req.auth.userId),
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      message: error.message || "Failed to build WebRTC configuration",
    });
  }
});

router.get("/ice-servers", requireAuth, async (req, res) => {
  try {
    const provider = String(req.query.provider || "").trim().toLowerCase();
    const ttlSeconds = req.query.ttlSeconds;
    const iceResult = await resolveIceServers({ provider, ttlSeconds });
    return res.json({
      provider: iceResult.provider,
      iceServers: iceResult.iceServers,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      message: error.message || "Failed to fetch ICE servers",
    });
  }
});

module.exports = router;
