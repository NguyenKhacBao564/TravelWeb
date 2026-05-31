/**
 * Chat Insights Service — reads JSONL analytics log and computes aggregates.
 *
 * No MSSQL dependency. Pure file-based aggregation.
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
 * Computes aggregated insights from the JSONL log file.
 *
 * @param {object} [options]
 * @param {number} [options.limit=200]    — cap on recent_events array length
 * @param {string} [options.logPath]      — override log file path
 * @returns {object}
 */
const getInsights = ({ limit = 200, logPath = DEFAULT_LOG_PATH } = {}) => {
  const entries = readEntries(logPath);
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
      recent_events: [],
    };
  }

  // --- Status distribution ---
  const statusDistribution = {};
  let fallbackCount = 0;
  let noResultSearches = 0;
  let totalLatency = 0;
  let latencyCount = 0;
  const destinationCounts = {};
  const intentCounts = {};
  const categoryCounts = {};
  let faqOpportunityCount = 0;

  for (const entry of entries) {
    const status = entry.status || "(unknown)";
    statusDistribution[status] = (statusDistribution[status] || 0) + 1;

    if (entry.fallback_used) fallbackCount++;
    if (entry.final_status === "no_results") noResultSearches++;

    if (entry.latency_ms != null) {
      totalLatency += entry.latency_ms;
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
  }

  // Sort and take top destinations
  const topDestinations = Object.entries(destinationCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([destination, count]) => ({ destination, count }));

  const queryIntentDistribution = Object.entries(intentCounts)
    .sort(([, a], [, b]) => b - a)
    .reduce((acc, [intent, count]) => {
      acc[intent] = count;
      return acc;
    }, {});

  const contentCategoryDistribution = Object.entries(categoryCounts)
    .sort(([, a], [, b]) => b - a)
    .reduce((acc, [category, count]) => {
      acc[category] = count;
      return acc;
    }, {});

  const avgLatencyMs =
    latencyCount > 0 ? Math.round(totalLatency / latencyCount) : null;

  const recentEvents = entries
    .slice(-limit)
    .map((entry) => ({
      timestamp: entry.timestamp,
      user_id: entry.user_id,
      query_len: entry.query_len,
      status: entry.status,
      final_status: entry.final_status,
      fallback_used: entry.fallback_used,
      tours_count: entry.tours_count,
      latency_ms: entry.latency_ms,
      location: entry.location,
    }));

  return {
    total_chats: total,
    fallback_count: fallbackCount,
    fallback_rate: Math.round((fallbackCount / total) * 1000) / 1000,
    status_distribution: statusDistribution,
    top_destinations: topDestinations,
    query_intent_distribution: queryIntentDistribution,
    content_category_distribution: contentCategoryDistribution,
    faq_opportunities_count: faqOpportunityCount,
    no_result_searches: noResultSearches,
    avg_latency_ms: avgLatencyMs,
    recent_events: recentEvents,
  };
};

module.exports = { getInsights, getRecentLogs, readEntries, DEFAULT_LOG_PATH };
