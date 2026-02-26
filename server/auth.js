const jwt = require("jsonwebtoken");
const { get } = require("./db");

const JWT_SECRET = process.env.JWT_SECRET || "replace-this-secret-in-production";

function extractBearerToken(headerValue = "") {
  const [scheme, token] = headerValue.split(" ");
  if (scheme !== "Bearer" || !token) return null;
  return token;
}

async function authenticate(req, res, next) {
  try {
    const token = extractBearerToken(req.headers.authorization);
    if (!token) {
      return res.status(401).json({ error: "Missing auth token" });
    }

    const payload = jwt.verify(token, JWT_SECRET);
    const revoked = await get("SELECT jti FROM revoked_tokens WHERE jti = ?", [payload.jti]);
    if (revoked) {
      return res.status(401).json({ error: "Token revoked" });
    }

    req.user = {
      id: payload.sub,
      email: payload.email,
      jti: payload.jti,
      exp: payload.exp,
      token,
    };
    return next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

module.exports = {
  JWT_SECRET,
  authenticate,
};
