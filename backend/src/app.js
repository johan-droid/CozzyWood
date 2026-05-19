const path = require("node:path");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const express = require("express");
const env = require("./config/env");
const authRoutes = require("./routes/auth.routes");
const mediaRoutes = require("./routes/media.routes");
const webrtcRoutes = require("./routes/webrtc.routes");

const app = express();
app.set("trust proxy", 1);

app.use(
  cors({
    origin: env.CLIENT_ORIGIN,
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());
app.use("/uploads", express.static(path.resolve(process.cwd(), "uploads")));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/api/auth", authRoutes);
app.use("/api/media", mediaRoutes);
app.use("/api/webrtc", webrtcRoutes);

app.use((err, _req, res, _next) => {
  // eslint-disable-next-line no-console
  console.error(err);
  res.status(500).json({ message: "Unexpected server error" });
});

module.exports = app;
