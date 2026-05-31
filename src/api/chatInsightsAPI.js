import axios from "axios";
import { API_URL } from "../utils/API_Port";

// Empty shape matching the backend's "no data" response so the UI can
// safely destructure without null checks even if the call fails.
const EMPTY_INSIGHTS = {
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

export const fetchChatInsights = async ({ limit = 200 } = {}) => {
  const response = await axios.get(`${API_URL}/chat/insights`, {
    params: { limit },
  });
  return { ...EMPTY_INSIGHTS, ...(response.data || {}) };
};

export const fetchChatLogs = async ({ limit = 50 } = {}) => {
  const response = await axios.get(`${API_URL}/chat/logs`, {
    params: { limit },
  });
  const data = response.data || {};
  return {
    count: data.count ?? 0,
    limit: data.limit ?? limit,
    logs: Array.isArray(data.logs) ? data.logs : [],
  };
};
