const path = require("path");
const crypto = require("crypto");
const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const { run, get, all } = require("./db");
const { JWT_SECRET, authenticate } = require("./auth");
const { isMailerConfigured, sendVerificationCode } = require("./mailer");

const app = express();
const PORT = Number(process.env.PORT || 3000);
const NODE_ENV = process.env.NODE_ENV || "development";

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 40,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many attempts, try again later" },
});

app.use(
  helmet({
    contentSecurityPolicy: false,
  })
);
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || "";
app.use(
  cors(
    FRONTEND_ORIGIN
      ? {
          origin: FRONTEND_ORIGIN,
        }
      : undefined
  )
);
app.use(express.json({ limit: "100kb" }));

function sanitizeEmail(email = "") {
  return String(email).trim().toLowerCase();
}

function generateVerificationCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function generateToken(user) {
  const jti = crypto.randomUUID();
  const payload = {
    sub: user.id,
    email: user.email,
    jti,
  };
  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "24h" });
  return { token, jti };
}

app.post("/api/auth/register", authLimiter, async (req, res) => {
  try {
    const email = sanitizeEmail(req.body.email);
    const password = String(req.body.password || "");

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: "Password must be at least 8 characters" });
    }

    const existing = await get("SELECT id, is_verified FROM users WHERE email = ?", [email]);
    if (existing && existing.is_verified) {
      return res.status(409).json({ error: "User already exists" });
    }

    const code = generateVerificationCode();
    const codeExpiresAt = Date.now() + 10 * 60 * 1000;
    const passwordHash = await bcrypt.hash(password, 12);

    if (existing) {
      await run(
        `UPDATE users
         SET password_hash = ?, verify_code = ?, verify_code_expires_at = ?, is_verified = 0
         WHERE id = ?`,
        [passwordHash, code, codeExpiresAt, existing.id]
      );
    } else {
      await run(
        `INSERT INTO users (email, password_hash, is_verified, verify_code, verify_code_expires_at, created_at)
         VALUES (?, ?, 0, ?, ?, ?)`,
        [email, passwordHash, code, codeExpiresAt, Date.now()]
      );
    }

    if (isMailerConfigured()) {
      await sendVerificationCode(email, code);
    }

    const response = { success: true };
    if (NODE_ENV !== "production" || !isMailerConfigured()) {
      response.verificationCode = code;
    }
    return res.json(response);
  } catch (err) {
    return res.status(500).json({ error: "Failed to register" });
  }
});

app.post("/api/auth/verify", authLimiter, async (req, res) => {
  try {
    const email = sanitizeEmail(req.body.email);
    const code = String(req.body.code || "").trim();
    if (!email || !code) {
      return res.status(400).json({ error: "Email and code are required" });
    }

    const user = await get(
      "SELECT id, verify_code, verify_code_expires_at FROM users WHERE email = ?",
      [email]
    );
    if (!user || !user.verify_code) {
      return res.status(400).json({ error: "Verification session expired or not found" });
    }
    if (Date.now() > user.verify_code_expires_at) {
      return res.status(400).json({ error: "Verification code expired" });
    }
    if (code !== user.verify_code) {
      return res.status(400).json({ error: "Invalid verification code" });
    }

    await run(
      "UPDATE users SET is_verified = 1, verify_code = NULL, verify_code_expires_at = NULL WHERE id = ?",
      [user.id]
    );
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: "Failed to verify account" });
  }
});

app.post("/api/auth/login", authLimiter, async (req, res) => {
  try {
    const email = sanitizeEmail(req.body.email);
    const password = String(req.body.password || "");
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const user = await get(
      "SELECT id, email, password_hash, is_verified FROM users WHERE email = ?",
      [email]
    );
    if (!user) {
      return res.status(401).json({ error: "Invalid email or password" });
    }
    if (!user.is_verified) {
      return res.status(403).json({ error: "Email is not verified" });
    }

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const { token } = generateToken(user);
    return res.json({
      user: { id: user.id, email: user.email },
      token,
    });
  } catch (err) {
    return res.status(500).json({ error: "Failed to login" });
  }
});

app.get("/api/auth/me", authenticate, async (req, res) => {
  try {
    const user = await get("SELECT id, email FROM users WHERE id = ?", [req.user.id]);
    if (!user) return res.status(404).json({ error: "User not found" });
    return res.json({ user });
  } catch (err) {
    return res.status(500).json({ error: "Failed to get profile" });
  }
});

app.post("/api/auth/logout", authenticate, async (req, res) => {
  try {
    await run("DELETE FROM revoked_tokens WHERE expires_at < ?", [Date.now()]);
    await run("INSERT OR REPLACE INTO revoked_tokens (jti, expires_at) VALUES (?, ?)", [
      req.user.jti,
      req.user.exp * 1000,
    ]);
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: "Failed to logout" });
  }
});

app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    env: NODE_ENV,
    mailerConfigured: isMailerConfigured(),
    timestamp: new Date().toISOString(),
  });
});

app.get("/api/branches", authenticate, async (req, res) => {
  try {
    const branches = await all(
      "SELECT id, name, location, created_at FROM branches WHERE user_id = ? ORDER BY id DESC",
      [req.user.id]
    );
    return res.json({
      branches: branches.map((b) => ({
        id: b.id,
        name: b.name,
        location: b.location,
        createdAt: b.created_at,
      })),
    });
  } catch (err) {
    return res.status(500).json({ error: "Failed to load branches" });
  }
});

app.post("/api/branches", authenticate, async (req, res) => {
  try {
    const name = String(req.body.name || "").trim();
    const location = String(req.body.location || "").trim();
    if (!name || !location) {
      return res.status(400).json({ error: "Name and location are required" });
    }

    const createdAt = Date.now();
    const result = await run(
      "INSERT INTO branches (user_id, name, location, created_at) VALUES (?, ?, ?, ?)",
      [req.user.id, name, location, createdAt]
    );
    return res.status(201).json({
      branch: {
        id: result.id,
        name,
        location,
        createdAt,
      },
    });
  } catch (err) {
    return res.status(500).json({ error: "Failed to create branch" });
  }
});

app.use(express.static(path.join(__dirname, "..")));
app.get("/*rest", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "index.html"));
});

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Fabric Automation API running on http://localhost:${PORT}`);
});
