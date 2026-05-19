const bcrypt = require("bcrypt");
const express = require("express");
const prisma = require("../lib/prisma");
const requireAuth = require("../middleware/requireAuth");
const env = require("../config/env");
const {
  COOKIE_NAME,
  createTokenId,
  getRefreshTokenCookieOptions,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} = require("../utils/tokens");

const router = express.Router();

function toPublicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    createdAt: user.createdAt,
  };
}

async function createSessionAndTokens(user) {
  const jti = createTokenId();
  const expiresAt = new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);
  const session = await prisma.session.create({
    data: {
      userId: user.id,
      refreshTokenId: jti,
      expiresAt,
    },
  });

  const refreshToken = signRefreshToken({ userId: user.id, sessionId: session.id, jti });
  const accessToken = signAccessToken(user);

  return { refreshToken, accessToken };
}

router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body ?? {};
    if (!name || !email || !password) {
      return res.status(400).json({ message: "name, email and password are required" });
    }

    const normalizedEmail = String(email).toLowerCase().trim();
    const trimmedName = String(name).trim();
    if (password.length < 8) {
      return res.status(400).json({ message: "Password must be at least 8 characters" });
    }

    const [usersCount, existingUser] = await Promise.all([
      prisma.user.count(),
      prisma.user.findUnique({ where: { email: normalizedEmail } }),
    ]);

    if (usersCount >= env.MAX_USERS) {
      return res.status(403).json({ message: `Maximum ${env.MAX_USERS} users allowed in this phase` });
    }
    if (existingUser) {
      return res.status(409).json({ message: "Email already in use" });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: { name: trimmedName, email: normalizedEmail, passwordHash },
    });
    const { accessToken, refreshToken } = await createSessionAndTokens(user);

    res.cookie(COOKIE_NAME, refreshToken, getRefreshTokenCookieOptions());
    return res.status(201).json({ user: toPublicUser(user), accessToken });
  } catch (error) {
    return res.status(500).json({ message: "Failed to register user", error: error.message });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body ?? {};
    if (!email || !password) {
      return res.status(400).json({ message: "email and password are required" });
    }

    const user = await prisma.user.findUnique({
      where: { email: String(email).toLowerCase().trim() },
    });
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const passwordIsValid = await bcrypt.compare(password, user.passwordHash);
    if (!passwordIsValid) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const { accessToken, refreshToken } = await createSessionAndTokens(user);
    res.cookie(COOKIE_NAME, refreshToken, getRefreshTokenCookieOptions());
    return res.json({ user: toPublicUser(user), accessToken });
  } catch (error) {
    return res.status(500).json({ message: "Failed to login", error: error.message });
  }
});

router.post("/refresh", async (req, res) => {
  try {
    const refreshToken = req.cookies?.[COOKIE_NAME];
    if (!refreshToken) {
      return res.status(401).json({ message: "Missing refresh token" });
    }

    const payload = verifyRefreshToken(refreshToken);
    if (!payload?.sessionId || !payload?.jti) {
      return res.status(401).json({ message: "Invalid refresh token" });
    }

    const session = await prisma.session.findUnique({
      where: { id: payload.sessionId },
      include: { user: true },
    });

    const invalidSession =
      !session ||
      session.revokedAt ||
      session.expiresAt <= new Date() ||
      session.refreshTokenId !== payload.jti;

    if (invalidSession) {
      return res.status(401).json({ message: "Refresh session is not valid" });
    }

    const nextJti = createTokenId();
    const nextExpiresAt = new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);
    await prisma.session.update({
      where: { id: session.id },
      data: { refreshTokenId: nextJti, expiresAt: nextExpiresAt },
    });

    const newRefreshToken = signRefreshToken({
      userId: session.user.id,
      sessionId: session.id,
      jti: nextJti,
    });
    const accessToken = signAccessToken(session.user);

    res.cookie(COOKIE_NAME, newRefreshToken, getRefreshTokenCookieOptions());
    return res.json({ accessToken });
  } catch {
    return res.status(401).json({ message: "Invalid or expired refresh token" });
  }
});

router.post("/logout", async (req, res) => {
  const refreshToken = req.cookies?.[COOKIE_NAME];
  if (refreshToken) {
    try {
      const payload = verifyRefreshToken(refreshToken);
      if (payload?.sessionId) {
        await prisma.session.update({
          where: { id: payload.sessionId },
          data: { revokedAt: new Date() },
        });
      }
    } catch {
      // no-op: always clear cookie for idempotent logout
    }
  }

  res.clearCookie(COOKIE_NAME, getRefreshTokenCookieOptions());
  return res.status(204).send();
});

router.get("/me", requireAuth, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.auth.userId } });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    return res.json({ user: toPublicUser(user) });
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch user", error: error.message });
  }
});

module.exports = router;
