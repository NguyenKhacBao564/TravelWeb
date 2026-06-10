/**
 * Request ID Middleware
 *
 * Reads X-Request-ID from incoming headers if provided,
 * otherwise generates a new UUID v4. Attaches as req.requestId
 * and sets the response X-Request-ID header.
 *
 * Applied after auth middleware so req.user is available when needed.
 */
const { randomUUID } = require("crypto");

const requestIdMiddleware = (req, res, next) => {
  const incoming = req.headers["x-request-id"];
  const requestId =
    typeof incoming === "string" && incoming.length > 0 && incoming.length <= 64
      ? incoming
      : randomUUID();

  req.requestId = requestId;
  res.setHeader("X-Request-ID", requestId);
  next();
};

module.exports = { requestIdMiddleware };
