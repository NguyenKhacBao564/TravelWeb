const {
  fetchPythonChatbotResponse,
  fetchPythonChatbotHealth,
  normalizeUserId,
} = require("../services/pythonChatbotClient");
const {
  normalizeChatEntities,
  searchToursByChatEntities,
} = require("../services/chatTourSearchService");
const {
  shouldQueryDbForStatus,
  resolveFinalStatus,
  buildChatApiResponse,
  buildFallbackResponse,
} = require("../services/chatResponseMapper");
const { logChatEvent: defaultLogAnalytics } = require("../services/chatAnalyticsLogger");
const { getInsights, getRecentLogs } = require("../services/chatInsightsService");

const createGetRespondChat = (dependencies = {}) => {
  const fetchChatbotResponse =
    dependencies.fetchPythonChatbotResponse || fetchPythonChatbotResponse;
  const normalizeEntities =
    dependencies.normalizeChatEntities || normalizeChatEntities;
  const searchTours =
    dependencies.searchToursByChatEntities || searchToursByChatEntities;
  const buildFallback =
    dependencies.buildFallback || (() => buildFallbackResponse());
  const log = dependencies.log || ((msg) => console.log(msg));
  const logAnalytics = dependencies.logAnalytics || defaultLogAnalytics;

  return async (req, res) => {
    const requestStart = Date.now();
    let pythonLatency = 0;
    let dbLatency = 0;
    let fallbackUsed = false;

    try {
      const query =
        typeof req.body?.query === "string" ? req.body.query.trim() : "";

      if (!query) {
        return res.status(400).json({ error: "Query is required" });
      }

      const userId = normalizeUserId(
        req.body?.user_id || req.body?.userId || req.user?.userId
      );

      const pythonStart = Date.now();
      const pythonPayload = await fetchChatbotResponse(query, { userId });
      pythonLatency = Date.now() - pythonStart;

      const normalizedEntities = normalizeEntities(pythonPayload.entities);
      const shouldQueryDb = shouldQueryDbForStatus(pythonPayload.status);

      let tourSearchResult = {
        entities: normalizedEntities,
        tourlist: [],
        hasSearchFilters: false,
        queryExecuted: false,
      };

      if (shouldQueryDb) {
        const dbStart = Date.now();
        tourSearchResult = await searchTours(normalizedEntities);
        dbLatency = Date.now() - dbStart;
      }

      const finalStatus = resolveFinalStatus({
        pythonStatus: pythonPayload.status,
        tourCount: tourSearchResult.tourlist.length,
      });

      const response = buildChatApiResponse({
        pythonPayload,
        finalStatus,
        entities: tourSearchResult.entities || normalizedEntities,
        tourlist: tourSearchResult.tourlist,
      });

      const totalLatency = Date.now() - requestStart;

      log(
        JSON.stringify({
          event: "chat_request",
          user_id: userId || "(anonymous)",
          query_len: query.length,
          python_chatbot_latency_ms: pythonLatency,
          db_search_latency_ms: dbLatency,
          total_request_latency_ms: totalLatency,
          python_status: pythonPayload.status,
          final_status: finalStatus,
          tours_count: tourSearchResult.tourlist.length,
          fallback_used: false,
        })
      );

      // Fire-and-forget analytics — errors are swallowed so they never affect the response
      try {
        logAnalytics({
          userId,
          query,
          pythonStatus: pythonPayload.status,
          finalStatus,
          fallbackUsed: false,
          toursCount: tourSearchResult.tourlist.length,
          latencyMs: totalLatency,
          entities: normalizedEntities,
          searchMetadata: pythonPayload.search_metadata || null,
        });
      } catch {
        // Swallow — analytics failure must never break the chat response.
      }

      return res.status(200).json(response);
    } catch (error) {
      fallbackUsed = true;
      const totalLatency = Date.now() - requestStart;

      const errorKey =
        error.name === "ChatbotContractError"
          ? "contract_error"
          : error.code === "ECONNREFUSED"
          ? "connection_refused"
          : error.code === "ETIMEDOUT" || error.code === "ECONNABORTED"
          ? "timeout"
          : "internal_error";

      log(
        JSON.stringify({
          event: "chat_request",
          user_id: normalizeUserId(
            req.body?.user_id || req.body?.userId || req.user?.userId
          ) || "(anonymous)",
          query_len:
            typeof req.body?.query === "string"
              ? req.body.query.trim().length
              : 0,
          python_chatbot_latency_ms: pythonLatency,
          db_search_latency_ms: dbLatency,
          total_request_latency_ms: totalLatency,
          error_type: errorKey,
          fallback_used: true,
        })
      );

      // Fire-and-forget analytics — errors are swallowed so they never affect the response
      try {
        logAnalytics({
          userId: normalizeUserId(
            req.body?.user_id || req.body?.userId || req.user?.userId
          ),
          query: typeof req.body?.query === "string" ? req.body.query : "",
          pythonStatus: errorKey,
          finalStatus: "ai_unavailable",
          fallbackUsed: true,
          toursCount: 0,
          latencyMs: totalLatency,
          entities: {},
          searchMetadata: null,
        });
      } catch {
        // Swallow — analytics failure must never break the chat response.
      }

      // Always return stable JSON — no stack traces, no 502 breaking the UI
      return res.status(200).json(buildFallback());
    }
  };
};

const createGetChatHealth = (dependencies = {}) => {
  const fetchHealth =
    dependencies.fetchHealth || fetchPythonChatbotHealth;
  const log = dependencies.log || ((msg) => console.log(msg));

  return async (req, res) => {
    const pythonResult = await fetchHealth();

    const overallStatus = pythonResult.status === "ok" ? "ok" : "degraded";

    log(
      JSON.stringify({
        event: "chat_health_check",
        python_status: pythonResult.status,
        latency_ms: pythonResult.latency_ms,
        overall_status: overallStatus,
      })
    );

    return res.status(200).json({
      status: overallStatus,
      service: "travelweb-chat-integration",
      python_chatbot: pythonResult,
    });
  };
};

const getRespondChat = createGetRespondChat();
const getChatHealth = createGetChatHealth();

const getChatLogs = (req, res) => {
  const limit = Math.min(parseInt(req.query?.limit, 10) || 50, 500);
  const logPath = req.query?.logPath || undefined;
  const logs = getRecentLogs(limit, logPath);
  return res.status(200).json({
    count: logs.length,
    limit,
    logs,
  });
};

const getChatInsights = (req, res) => {
  const limit = Math.min(parseInt(req.query?.limit, 10) || 200, 500);
  const logPath = req.query?.logPath || undefined;
  const insights = getInsights({ limit, logPath });
  return res.status(200).json(insights);
};

module.exports = {
  getRespondChat,
  getChatHealth,
  createGetRespondChat,
  createGetChatHealth,
  getChatLogs,
  getChatInsights,
};
