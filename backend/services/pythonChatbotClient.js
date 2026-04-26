const axios = require("axios");

const DEFAULT_PYTHON_CHATBOT_URL =
  process.env.PYTHON_CHATBOT_URL || "http://localhost:8000/chat";
const DEFAULT_TIMEOUT_MS = Number(
  process.env.PYTHON_CHATBOT_TIMEOUT_MS || 15000
);
const USER_ID_MAX_LENGTH = 128;

const SUPPORTED_CHAT_STATUSES = new Set([
  "missing_info",
  "partial_search",
  "success",
  "no_results",
  "faq",
]);

class ChatbotContractError extends Error {
  constructor(message) {
    super(message);
    this.name = "ChatbotContractError";
  }
}

const isPlainObject = (value) =>
  value !== null &&
  typeof value === "object" &&
  Object.getPrototypeOf(value) === Object.prototype;

const extractLegacyEntities = (payload = {}) => {
  const fallbackEntities = {};

  if (payload.location) {
    fallbackEntities.location = payload.location;
  }

  if (payload.time) {
    fallbackEntities.date_start = payload.time;
  }

  if (payload.price) {
    fallbackEntities.price_max = payload.price;
  }

  return fallbackEntities;
};

const normalizePythonChatbotPayload = (payload = {}) => {
  const status = typeof payload.status === "string" ? payload.status.trim() : "";

  if (!SUPPORTED_CHAT_STATUSES.has(status)) {
    throw new ChatbotContractError(
      `Unsupported chatbot status: ${status || "<empty>"}`
    );
  }

  const messageCandidate =
    typeof payload.message === "string"
      ? payload.message
      : typeof payload.response === "string"
      ? payload.response
      : "";

  const providedEntities = isPlainObject(payload.entities) ? payload.entities : {};
  const entities = {
    ...extractLegacyEntities(payload),
    ...providedEntities,
  };

  return {
    status,
    message: messageCandidate.trim(),
    entities,
    missing_fields: Array.isArray(payload.missing_fields)
      ? payload.missing_fields
      : [],
    tours: Array.isArray(payload.tours) ? payload.tours : [],
    faq_sources: Array.isArray(payload.faq_sources) ? payload.faq_sources : [],
  };
};

const normalizeUserId = (userId) => {
  if (typeof userId !== "string") {
    return undefined;
  }

  const normalized = userId.trim();
  if (!normalized) {
    return undefined;
  }

  return normalized.slice(0, USER_ID_MAX_LENGTH);
};

const fetchPythonChatbotResponse = async (
  query,
  {
    httpClient = axios,
    url = DEFAULT_PYTHON_CHATBOT_URL,
    timeout = DEFAULT_TIMEOUT_MS,
    userId,
  } = {}
) => {
  const requestBody = { query };
  const normalizedUserId = normalizeUserId(userId);

  if (normalizedUserId) {
    requestBody.user_id = normalizedUserId;
  }

  const response = await httpClient.post(url, requestBody, { timeout });
  return normalizePythonChatbotPayload(response.data);
};

module.exports = {
  DEFAULT_PYTHON_CHATBOT_URL,
  ChatbotContractError,
  normalizePythonChatbotPayload,
  normalizeUserId,
  fetchPythonChatbotResponse,
};
