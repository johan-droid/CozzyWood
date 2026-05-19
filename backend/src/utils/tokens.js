const crypto = require("node:crypto");
const jwt = require("jsonwebtoken");
const env = require("../config/env");

const COOKIE_NAME = "cozzywood_refresh_token";

function signAccessToken(user) {
  return jwt.sign(
    { sub: user.id, email: user.email, name: user.name, type: "access" },
    env.JWT_ACCESS_SECRET,
    { expiresIn: env.ACCESS_TOKEN_TTL }
  );
}

function signRefreshToken(payload) {
  return jwt.sign(
    { sub: payload.userId, sessionId: payload.sessionId, jti: payload.jti, type: "refresh" },
    env.JWT_REFRESH_SECRET,
    { expiresIn: `${env.REFRESH_TOKEN_TTL_DAYS}d` }
  );
}

function verifyAccessToken(token) {
  return jwt.verify(token, env.JWT_ACCESS_SECRET);
}

function verifyRefreshToken(token) {
  return jwt.verify(token, env.JWT_REFRESH_SECRET);
}

function getRefreshTokenCookieOptions() {
  const isProduction = env.NODE_ENV === "production";
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: isProduction,
    path: "/api/auth",
    maxAge: env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000,
  };
}

function createTokenId() {
  return crypto.randomUUID();
}

module.exports = {
  COOKIE_NAME,
  createTokenId,
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  getRefreshTokenCookieOptions,
};
