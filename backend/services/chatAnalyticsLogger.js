/**
 * Chat Analytics Logger — JSONL append-only, fire-and-forget.
 *
 * Logs are written to a local JSONL file (one JSON object per line).
 * Failures are silently swallowed so logging never breaks the chat response.
 *
 * Privacy-safe: stores query_len, never the raw query text.
 */
const fs = require("fs");
const path = require("path");

const ANALYTICS_ENABLED =
  process.env.CHAT_ANALYTICS_ENABLED === "true";
const LOG_PATH =
  process.env.CHAT_ANALYTICS_LOG_PATH || "logs/chat_analytics.jsonl";

// Ensure the logs directory exists (idempotent)
const LOG_DIR = path.dirname(LOG_PATH);
try {
  if (LOG_DIR && !fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
} catch {
  // Silently ignore — directory creation failure should not crash the server.
}

/**
 * Appends one JSONL entry to the log file synchronously.
 * Silently exits on any error — fire-and-forget guarantee.
 *
 * @param {object} entry
 */
const appendLog = (entry) => {
  if (!ANALYTICS_ENABLED) return;

  try {
    const line = JSON.stringify(entry) + "\n";
    fs.appendFileSync(LOG_PATH, line, "utf8");
  } catch {
    // Fire-and-forget: swallow all errors so analytics never affects chat.
  }
};

/**
 * Logs a chat event after the response has been sent.
 * Safe to call with a subset of fields — missing fields are omitted from the line.
 *
 * @param {object} params
 * @param {string}       params.userId        — normalized user ID
 * @param {string}       params.query         — raw query text
 * @param {string}       params.pythonStatus  — status from Python chatbot
 * @param {string}       params.finalStatus   — resolved final status
 * @param {boolean}      params.fallbackUsed  — true when AI was unavailable
 * @param {number}       params.toursCount    — number of tours returned
 * @param {number}       params.latencyMs     — total request latency ms
 * @param {object}       [params.entities]   — extracted entities map
 * @param {object|null}  [params.searchMetadata] — from Python payload
 */
const logChatEvent = ({
  userId,
  query,
  pythonStatus,
  finalStatus,
  fallbackUsed,
  toursCount,
  latencyMs,
  entities = {},
  searchMetadata = null,
}) => {
  if (!ANALYTICS_ENABLED) return;

  const entry = {
    timestamp: new Date().toISOString(),
    user_id: userId || "(anonymous)",
    query_len: typeof query === "string" ? query.length : 0,
    status: pythonStatus || null,
    final_status: finalStatus || null,
    fallback_used: Boolean(fallbackUsed),
    tours_count: toursCount || 0,
    latency_ms: latencyMs || 0,
    location: entities?.location || null,
    destination_normalized: entities?.destination_normalized || null,
    date_start: entities?.date_start || null,
    date_end: entities?.date_end || null,
    price_min: entities?.price_min || null,
    price_max: entities?.price_max || null,
    duration: entities?.duration || null,
    query_intent: searchMetadata?.query_intent || null,
    related_keywords: searchMetadata?.related_keywords || null,
    content_category: searchMetadata?.content_category || null,
    faq_opportunity: searchMetadata?.faq_opportunity || null,
  };

  appendLog(entry);
};

module.exports = { logChatEvent, ANALYTICS_ENABLED, LOG_PATH };
