/**
 * Internal Service Authentication Middleware
 *
 * Protects internal tool endpoints that will be called by the Python AI Agent.
 * Reads the INTERNAL_SERVICE_TOKEN env var and validates a Bearer token header.
 *
 * Behavior:
 * - INTERNAL_SERVICE_TOKEN not set → 503 (misconfiguration, fail-closed)
 * - Authorization header missing or malformed → 401
 * - Token mismatch → 403
 * - Token valid → next()
 *
 * The token value is never logged.
 */

const internalServiceAuth = (req, res, next) => {
  const expectedToken = process.env.INTERNAL_SERVICE_TOKEN;

  if (!expectedToken) {
    return res.status(503).json({
      error: "internal_service_unavailable",
      message: "INTERNAL_SERVICE_TOKEN is not configured on the server",
    });
  }

  const authHeader = req.headers.authorization;

  if (!authHeader || typeof authHeader !== "string") {
    return res.status(401).json({
      error: "unauthorized",
      message: "Missing Authorization header",
    });
  }

  const parts = authHeader.split(" ");
  if (parts.length !== 2 || parts[0] !== "Bearer") {
    return res.status(401).json({
      error: "unauthorized",
      message: "Authorization header must be 'Bearer <token>'",
    });
  }

  const providedToken = parts[1];

  if (providedToken !== expectedToken) {
    return res.status(403).json({
      error: "forbidden",
      message: "Invalid service token",
    });
  }

  next();
};

module.exports = { internalServiceAuth };
