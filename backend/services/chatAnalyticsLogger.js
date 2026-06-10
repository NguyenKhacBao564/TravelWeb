/**
 * Chat Analytics Logger — JSONL append-only, fire-and-forget.
 *
 * Logs are written to a local JSONL file (one JSON object per line).
 * Failures are silently swallowed so logging never breaks the chat response.
 *
 * Privacy-safe: stores query_len, never the raw query text.
 * Agent V2 fields (Phase 3A+) are optional — old entries remain compatible.
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
 * Summarises the first tool trace step safely for analytics.
 * Never exposes chain-of-thought or raw reasoning.
 *
 * @param {Array} toolTrace
 * @returns {{ selected_tool: string|null, tool_status: string|null, error_type: string|null }|null}
 */
const summariseToolTrace = (toolTrace) => {
  if (!Array.isArray(toolTrace) || toolTrace.length === 0) {
    return null;
  }
  const first = toolTrace[0];
  return {
    selected_tool: first.selected_tool || null,
    tool_status: first.tool_status || null,
    error_type: first.error_type || null,
  };
};

/**
 * Logs a chat event after the response has been sent.
 * Safe to call with a subset of fields — missing fields are omitted from the line.
 *
 * Legacy fields (always written when present):
 *   query_len, userId, pythonStatus, finalStatus, fallbackUsed, toursCount,
 *   latencyMs, entities, searchMetadata
 *
 * Agent V2 fields (Phase 3A+, written when available):
 *   sessionId, agentV2Enabled, routeSource, memoryUsed,
 *   selectedTool, toolStatus, toolErrorType, toolTraceCount,
 *   fallbackReason, toolLatencyMs
 *
 * @param {object} params
 */
const logChatEvent = ({
  userId,
  query,
  requestId,
  pythonStatus,
  finalStatus,
  fallbackUsed,
  toursCount,
  latencyMs,
  entities = {},
  searchMetadata = null,
  // Agent V2 optional fields (Phase 3A+)
  sessionId = undefined,
  agentV2Enabled = false,
  routeSource = undefined,
  memoryUsed = undefined,
  selectedTool = undefined,
  toolStatus = undefined,
  toolErrorType = undefined,
  fallbackReason = undefined,
  toolLatencyMs = undefined,
  toolTrace = undefined,
}) => {
  if (!ANALYTICS_ENABLED) return;

  const entry = {
    timestamp: new Date().toISOString(),
    request_id: requestId || null,
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

  // Agent V2 fields — only written when agent_v2_enabled or sessionId is set
  if (agentV2Enabled || sessionId) {
    // Summarise tool trace if present
    const traceSummary = toolTrace ? summariseToolTrace(toolTrace) : null;

    entry.agent_v2_enabled = agentV2Enabled;
    entry.session_id = sessionId || null;
    entry.route_source = routeSource || null;
    entry.memory_used = typeof memoryUsed === "boolean" ? memoryUsed : null;
    entry.selected_tool = selectedTool || traceSummary?.selected_tool || null;
    entry.tool_status = toolStatus || traceSummary?.tool_status || null;
    entry.tool_error_type = toolErrorType || traceSummary?.error_type || null;
    entry.fallback_reason = fallbackReason || null;
    entry.tool_latency_ms = typeof toolLatencyMs === "number" ? toolLatencyMs : null;
    entry.tool_trace_count = Array.isArray(toolTrace) ? toolTrace.length : null;
  }

  appendLog(entry);
};

module.exports = {
  logChatEvent,
  ANALYTICS_ENABLED,
  LOG_PATH,
  summariseToolTrace,
};
