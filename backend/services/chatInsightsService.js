/**
 * Chat Insights Service — reads JSONL analytics log and computes aggregates.
 *
 * No MSSQL dependency. Pure file-based aggregation.
 * Supports both legacy and Agent V2 log entries (Phase 3A+).
 */
const fs = require("fs");
const path = require("path");

const DEFAULT_LOG_PATH =
  process.env.CHAT_ANALYTICS_LOG_PATH || "logs/chat_analytics.jsonl";

/**
 * Parses a single JSONL line safely.
 * @param {string} line
 * @returns {object|null}
 */
const parseLine = (line) => {
  const trimmed = line.trim();
  if (!trimmed) return null;
  try {
    return JSON.parse(trimmed);
  } catch {
    return null;
  }
};

/**
 * Reads and parses all entries from the JSONL log file.
 * Returns an empty array if the file does not exist or is unreadable.
 *
 * @param {string} [logPath]
 * @returns {object[]}
 */
const readEntries = (logPath = DEFAULT_LOG_PATH) => {
  try {
    if (!fs.existsSync(logPath)) return [];
    const raw = fs.readFileSync(logPath, "utf8");
    const lines = raw.split("\n");
    return lines.map(parseLine).filter(Boolean);
  } catch {
    return [];
  }
};

/**
 * Reads the most recent N entries from the log file.
 *
 * @param {number} [limit=50]
 * @param {string} [logPath]
 * @returns {object[]}
 */
const getRecentLogs = (limit = 50, logPath = DEFAULT_LOG_PATH) => {
  const entries = readEntries(logPath);
  return entries.slice(-limit);
};

/**
 * Computes the p95 (95th percentile) of an array of numbers.
 * Returns null if the array is empty or has fewer than 2 elements.
 *
 * @param {number[]} values
 * @returns {number|null}
 */
const computeP95 = (values) => {
  if (!values || values.length < 2) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.ceil(sorted.length * 0.95) - 1;
  return Math.round(sorted[Math.max(0, idx)]);
};

/**
 * Builds a distribution object from a counter map.
 * Returns entries sorted by count descending.
 *
 * @param {object} counter
 * @returns {object}
 */
const buildDistribution = (counter) =>
  Object.entries(counter)
    .sort(([, a], [, b]) => b - a)
    .reduce((acc, [k, v]) => {
      acc[k] = v;
      return acc;
    }, {});

/**
 * Computes aggregated insights from the JSONL log file.
 * Supports both legacy and Agent V2 log entries (Phase 3A+).
 *
 * @param {object} [options]
 * @param {number} [options.limit=200]    — cap on recent_events array length
 * @param {string} [options.logPath]     — override log file path
 * @returns {object}
 */
const getInsights = ({ limit = 200, logPath = DEFAULT_LOG_PATH } = {}) => {
  const entries = _testEntries !== null ? _testEntries : readEntries(logPath);
  const total = entries.length;

  if (total === 0) {
    return {
      total_chats: 0,
      fallback_count: 0,
      fallback_rate: 0,
      status_distribution: {},
      top_destinations: [],
      query_intent_distribution: {},
      content_category_distribution: {},
      faq_opportunities_count: 0,
      no_result_searches: 0,
      avg_latency_ms: null,
      p95_latency_ms: null,
      recent_events: [],
      // Agent V2 aggregates (Phase 3A+)
      total_sessions: 0,
      agent_v2_requests: 0,
      agent_v2_rate: 0,
      memory_used_count: 0,
      memory_used_rate: 0,
      selected_tool_distribution: {},
      route_source_distribution: {},
      tool_status_distribution: {},
      tool_error_distribution: {},
      fallback_reason_distribution: {},
    };
  }

  // --- Legacy aggregates ---
  const statusDistribution = {};
  let fallbackCount = 0;
  let noResultSearches = 0;
  let totalLatency = 0;
  let latencyCount = 0;
  const destinationCounts = {};
  const intentCounts = {};
  const categoryCounts = {};
  let faqOpportunityCount = 0;

  // --- Agent V2 aggregates (Phase 3A+) ---
  const sessionIds = new Set();
  let agentV2Requests = 0;
  let memoryUsedCount = 0;
  const selectedToolCounts = {};
  const routeSourceCounts = {};
  const toolStatusCounts = {};
  const toolErrorCounts = {};
  const fallbackReasonCounts = {};
  const latencyValues = [];

  for (const entry of entries) {
    // --- Legacy aggregates ---
    const status = entry.status || "(unknown)";
    statusDistribution[status] = (statusDistribution[status] || 0) + 1;

    if (entry.fallback_used) fallbackCount++;
    if (entry.final_status === "no_results") noResultSearches++;

    if (entry.latency_ms != null) {
      totalLatency += entry.latency_ms;
      latencyValues.push(entry.latency_ms);
      latencyCount++;
    }

    const loc = entry.destination_normalized || entry.location;
    if (loc) {
      destinationCounts[loc] = (destinationCounts[loc] || 0) + 1;
    }

    if (entry.query_intent) {
      intentCounts[entry.query_intent] = (intentCounts[entry.query_intent] || 0) + 1;
    }

    if (entry.content_category) {
      categoryCounts[entry.content_category] =
        (categoryCounts[entry.content_category] || 0) + 1;
    }

    if (entry.faq_opportunity === true) {
      faqOpportunityCount++;
    }

    // --- Agent V2 aggregates ---
    if (entry.session_id) {
      sessionIds.add(entry.session_id);
    }

    if (entry.agent_v2_enabled) {
      agentV2Requests++;
    }

    if (entry.memory_used === true) {
      memoryUsedCount++;
    }

    if (entry.selected_tool) {
      selectedToolCounts[entry.selected_tool] =
        (selectedToolCounts[entry.selected_tool] || 0) + 1;
    }

    if (entry.route_source) {
      routeSourceCounts[entry.route_source] =
        (routeSourceCounts[entry.route_source] || 0) + 1;
    }

    if (entry.tool_status) {
      toolStatusCounts[entry.tool_status] =
        (toolStatusCounts[entry.tool_status] || 0) + 1;
    }

    if (entry.tool_error_type) {
      toolErrorCounts[entry.tool_error_type] =
        (toolErrorCounts[entry.tool_error_type] || 0) + 1;
    }

    if (entry.fallback_reason) {
      fallbackReasonCounts[entry.fallback_reason] =
        (fallbackReasonCounts[entry.fallback_reason] || 0) + 1;
    }
  }

  // Sort and take top destinations
  const topDestinations = Object.entries(destinationCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([destination, count]) => ({ destination, count }));

  const avgLatencyMs =
    latencyCount > 0 ? Math.round(totalLatency / latencyCount) : null;
  const p95LatencyMs = computeP95(latencyValues);

  // Build event summaries — include agent fields when present
  const recentEvents = entries
    .slice(-limit)
    .map((entry) => {
      const event = {
        timestamp: entry.timestamp,
        user_id: entry.user_id,
        query_len: entry.query_len,
        status: entry.status,
        final_status: entry.final_status,
        fallback_used: entry.fallback_used,
        tours_count: entry.tours_count,
        latency_ms: entry.latency_ms,
        location: entry.location,
      };

      // Agent V2 fields — only include when available
      if (entry.agent_v2_enabled || entry.session_id) {
        event.session_id = entry.session_id || null;
        event.selected_tool = entry.selected_tool || null;
        event.route_source = entry.route_source || null;
        event.memory_used = entry.memory_used || null;
        event.tool_status = entry.tool_status || null;
        event.tool_error_type = entry.tool_error_type || null;
      }

      return event;
    });

  return {
    // Legacy aggregates (preserved)
    total_chats: total,
    fallback_count: fallbackCount,
    fallback_rate: Math.round((fallbackCount / total) * 1000) / 1000,
    status_distribution: statusDistribution,
    top_destinations: topDestinations,
    query_intent_distribution: buildDistribution(intentCounts),
    content_category_distribution: buildDistribution(categoryCounts),
    faq_opportunities_count: faqOpportunityCount,
    no_result_searches: noResultSearches,
    avg_latency_ms: avgLatencyMs,
    p95_latency_ms: p95LatencyMs,
    recent_events: recentEvents,

    // Agent V2 aggregates (Phase 3A+)
    total_sessions: sessionIds.size,
    agent_v2_requests: agentV2Requests,
    agent_v2_rate:
      agentV2Requests > 0
        ? Math.round((agentV2Requests / total) * 1000) / 1000
        : 0,
    memory_used_count: memoryUsedCount,
    memory_used_rate:
      agentV2Requests > 0
        ? Math.round((memoryUsedCount / agentV2Requests) * 1000) / 1000
        : 0,
    selected_tool_distribution: buildDistribution(selectedToolCounts),
    route_source_distribution: buildDistribution(routeSourceCounts),
    tool_status_distribution: buildDistribution(toolStatusCounts),
    tool_error_distribution: buildDistribution(toolErrorCounts),
    fallback_reason_distribution: buildDistribution(fallbackReasonCounts),
  };
};

/**
 * INTERNAL — for testing only. Do not use in production.
 * Patches the entries returned by readEntries() for unit tests.
 *
 * @param {object[]} entries
 */
let _testEntries = null;
const __setEntries = (entries) => {
  _testEntries = entries;
};

module.exports = {
  getInsights,
  getRecentLogs,
  readEntries,
  DEFAULT_LOG_PATH,
  computeP95,
  buildDistribution,
  __setEntries,
};
