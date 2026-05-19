const { ExpressPeerServer } = require("peer");
const env = require("../config/env");

function normalizePath(pathValue) {
  const raw = String(pathValue || "").trim();
  if (!raw) {
    return "/peerjs";
  }
  return raw.startsWith("/") ? raw : `/${raw}`;
}

function attachPeerServer(app, httpServer) {
  const mountPath = normalizePath(env.PEER_SERVER_PATH);

  const peerServer = ExpressPeerServer(httpServer, {
    path: "/",
    key: env.PEER_SERVER_KEY,
    proxied: env.PEER_SERVER_PROXIED,
    allow_discovery: env.PEER_SERVER_ALLOW_DISCOVERY,
    concurrent_limit: env.PEER_SERVER_CONCURRENT_LIMIT,
    alive_timeout: env.PEER_SERVER_ALIVE_TIMEOUT_MS,
    expire_timeout: env.PEER_SERVER_EXPIRE_TIMEOUT_MS,
  });

  peerServer.on("connection", (client) => {
    // eslint-disable-next-line no-console
    console.log(`Peer connected: ${client.getId()}`);
  });

  peerServer.on("disconnect", (client) => {
    // eslint-disable-next-line no-console
    console.log(`Peer disconnected: ${client.getId()}`);
  });

  app.use(mountPath, peerServer);

  return {
    path: mountPath,
    key: env.PEER_SERVER_KEY,
  };
}

module.exports = attachPeerServer;
