require("dotenv").config();
const http = require("node:http");
const app = require("./app");
const env = require("./config/env");
const attachSocketServer = require("./realtime/socketServer");
const attachPeerServer = require("./realtime/peerServer");

async function startServer() {
  const httpServer = http.createServer(app);
  const realtime = await attachSocketServer(httpServer);
  const peer = attachPeerServer(app, httpServer);

  httpServer.listen(env.PORT, () => {
    // eslint-disable-next-line no-console
    console.log(
      `API + Socket + Peer server running on http://localhost:${env.PORT} (redis: ${realtime.redisMode}, peerPath: ${peer.path})`
    );
  });
}

startServer().catch((error) => {
  // eslint-disable-next-line no-console
  console.error("Failed to start server:", error);
  process.exit(1);
});
