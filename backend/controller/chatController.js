const {
  fetchPythonChatbotResponse,
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
} = require("../services/chatResponseMapper");

const createGetRespondChat = (dependencies = {}) => {
  const fetchChatbotResponse =
    dependencies.fetchPythonChatbotResponse || fetchPythonChatbotResponse;
  const normalizeEntities =
    dependencies.normalizeChatEntities || normalizeChatEntities;
  const searchTours =
    dependencies.searchToursByChatEntities || searchToursByChatEntities;

  return async (req, res) => {
    try {
      const query =
        typeof req.body?.query === "string" ? req.body.query.trim() : "";

      if (!query) {
        return res.status(400).json({ error: "Query is required" });
      }

      const userId = normalizeUserId(
        req.body?.user_id || req.body?.userId || req.user?.userId
      );
      const pythonPayload = await fetchChatbotResponse(query, { userId });
      const normalizedEntities = normalizeEntities(pythonPayload.entities);
      const shouldQueryDb = shouldQueryDbForStatus(pythonPayload.status);

      let tourSearchResult = {
        entities: normalizedEntities,
        tourlist: [],
        hasSearchFilters: false,
        queryExecuted: false,
      };

      if (shouldQueryDb) {
        tourSearchResult = await searchTours(normalizedEntities);
      }

      const finalStatus = resolveFinalStatus({
        pythonStatus: pythonPayload.status,
        tourCount: tourSearchResult.tourlist.length,
      });

      return res.status(200).json(
        buildChatApiResponse({
          pythonPayload,
          finalStatus,
          entities: tourSearchResult.entities || normalizedEntities,
          tourlist: tourSearchResult.tourlist,
        })
      );
    } catch (error) {
      const errorMessage =
        error.response?.data?.message || error.message || "Something went wrong";

      console.error("Chat integration error:", errorMessage);

      const statusCode =
        error.name === "ChatbotContractError" ||
        error.code === "ECONNREFUSED" ||
        error.code === "ECONNABORTED"
          ? 502
          : 500;

      return res.status(statusCode).json({
        error:
          statusCode === 502
            ? "Chatbot service is unavailable or returned an invalid response"
            : "Something went wrong",
      });
    }
  };
};

const getRespondChat = createGetRespondChat();

module.exports = {
  getRespondChat,
  createGetRespondChat,
};
