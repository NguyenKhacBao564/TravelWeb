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

      log(
        JSON.stringify({
          event: "chat_request",
          user_id: userId || "(anonymous)",
          query_len: query.length,
          python_chatbot_latency_ms: pythonLatency,
          db_search_latency_ms: dbLatency,
          total_request_latency_ms: Date.now() - requestStart,
          python_status: pythonPayload.status,
          final_status: finalStatus,
          tours_count: tourSearchResult.tourlist.length,
          fallback_used: false,
        })
      );

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

module.exports = {
  getRespondChat,
  getChatHealth,
  createGetRespondChat,
  createGetChatHealth,
};
