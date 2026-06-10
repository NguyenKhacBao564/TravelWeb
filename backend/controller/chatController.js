const {
  fetchPythonChatbotResponse,
  fetchPythonChatbotHealth,
  fetchPythonAgentChatV2,
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
const {
  mapAgentV2ToFrontend,
  buildFallback: buildAgentFallback,
} = require("../services/agentV2ResponseMapper");
const { logChatEvent: defaultLogAnalytics } = require("../services/chatAnalyticsLogger");
const { getInsights, getRecentLogs } = require("../services/chatInsightsService");

const AGENT_V2_ENABLED =
  process.env.CHAT_AGENT_V2_ENABLED === "true";

const createGetRespondChat = (dependencies = {}) => {
  // Allow tests to inject a boolean flag; fall back to env when not injected
  const agentV2Enabled =
    typeof dependencies.agentV2Enabled === "boolean"
      ? dependencies.agentV2Enabled
      : AGENT_V2_ENABLED;
  const fetchChatbotResponse =
    dependencies.fetchPythonChatbotResponse || fetchPythonChatbotResponse;
  const fetchAgentV2Response =
    dependencies.fetchAgentV2Response || fetchPythonAgentChatV2;
  const mapAgentV2Response =
    dependencies.mapAgentV2Response || mapAgentV2ToFrontend;
  const normalizeEntities =
    dependencies.normalizeChatEntities || normalizeChatEntities;
  const searchTours =
    dependencies.searchToursByChatEntities || searchToursByChatEntities;
  const buildFallback =
    dependencies.buildFallback || (() => buildFallbackResponse());
  const buildAgentV2Fallback =
    dependencies.buildAgentV2Fallback || (() => buildAgentFallback());
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

      // Agent V2 mode: call /agent/chat-v2, skip legacy python chatbot
      if (agentV2Enabled) {
        const pythonStart = Date.now();
        const agentResponse = await fetchAgentV2Response(query, {
          userId,
          requestId: req.requestId,
        });
        pythonLatency = Date.now() - pythonStart;

        // agentResponse is always a dict (never raises) — safe to map
        const frontendResponse = mapAgentV2Response(agentResponse);
        const totalLatency = Date.now() - requestStart;

        // Log to console (same format as legacy path)
        log(
          JSON.stringify({
            event: "chat_request",
            request_id: req.requestId,
            user_id: userId || "(anonymous)",
            query_len: query.length,
            python_chatbot_latency_ms: pythonLatency,
            db_search_latency_ms: 0,
            total_request_latency_ms: totalLatency,
            agent_v2_status: frontendResponse.status,
            final_status: frontendResponse.status,
            tours_count: frontendResponse.tourlist?.length || 0,
            selected_tool: frontendResponse.search_metadata?.selected_tool || null,
            fallback_used: frontendResponse.fallback_used || false,
          })
        );

        // Fire-and-forget analytics
        try {
          logAnalytics({
            userId,
            query,
            requestId: req.requestId,
            pythonStatus: frontendResponse.status,
            finalStatus: frontendResponse.status,
            fallbackUsed: frontendResponse.fallback_used || false,
            toursCount: frontendResponse.tourlist?.length || 0,
            latencyMs: totalLatency,
            entities: frontendResponse.entities || {},
            searchMetadata: frontendResponse.search_metadata || null,
          });
        } catch {
          // Swallow — analytics failure must never break the chat response.
        }

        return res.status(200).json(frontendResponse);
      }

      // Legacy mode
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
          request_id: req.requestId,
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
          requestId: req.requestId,
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
          request_id: req.requestId,
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
          requestId: req.requestId,
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
        request_id: req.requestId,
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
