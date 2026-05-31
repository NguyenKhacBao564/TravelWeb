const QUERY_DB_STATUSES = new Set(["partial_search", "success", "no_results"]);

const DEFAULT_MESSAGES = {
  missing_info: "Mình cần thêm thông tin để tìm tour phù hợp cho bạn.",
  partial_search:
    "Mình đã tìm thấy một số tour dựa trên thông tin hiện có. Bạn có thể thêm thời gian hoặc ngân sách để lọc sát hơn.",
  success: "Mình đã tìm thấy một số tour phù hợp với yêu cầu của bạn.",
  no_results:
    "Xin lỗi, hiện tại chưa có tour phù hợp với yêu cầu của bạn. Bạn có thể thử đổi địa điểm, thời gian hoặc mức giá.",
  faq: "Mình đã tìm thấy thông tin hỗ trợ cho câu hỏi của bạn.",
};

const shouldQueryDbForStatus = (status) => QUERY_DB_STATUSES.has(status);

const resolveFinalStatus = ({ pythonStatus, tourCount }) => {
  if (pythonStatus === "missing_info" || pythonStatus === "faq") {
    return pythonStatus;
  }

  if (pythonStatus === "partial_search") {
    return "partial_search";
  }

  return tourCount > 0 ? "success" : "no_results";
};

const resolveMessage = ({
  pythonStatus,
  pythonMessage,
  finalStatus,
  tourCount = 0,
}) => {
  const trimmedMessage =
    typeof pythonMessage === "string" ? pythonMessage.trim() : "";

  if (finalStatus === "partial_search" && tourCount > 0) {
    return DEFAULT_MESSAGES.partial_search;
  }

  if (trimmedMessage && pythonStatus === finalStatus) {
    return trimmedMessage;
  }

  return DEFAULT_MESSAGES[finalStatus] || trimmedMessage || "";
};

const buildFallbackResponse = () => ({
  status: "ai_unavailable",
  message:
    "Trợ lý AI hiện chưa phản hồi được. Bạn vẫn có thể tìm tour bằng bộ lọc thông thường hoặc thử lại sau.",
  response:
    "Trợ lý AI hiện chưa phản hồi được. Bạn vẫn có thể tìm tour bằng bộ lọc thông thường hoặc thử lại sau.",
  entities: {},
  tourlist: [],
  missing_fields: [],
  faq_sources: [],
  fallback_used: true,
});

const buildChatApiResponse = ({
  pythonPayload,
  finalStatus,
  entities = {},
  tourlist = [],
}) => {
  const message = resolveMessage({
    pythonStatus: pythonPayload.status,
    pythonMessage: pythonPayload.message,
    finalStatus,
    tourCount: Array.isArray(tourlist) ? tourlist.length : 0,
  });

  const responsePayload = {
    status: finalStatus,
    message,
    response: message,
    missing_fields: Array.isArray(pythonPayload.missing_fields)
      ? pythonPayload.missing_fields
      : [],
    entities,
    tourlist: Array.isArray(tourlist) ? tourlist : [],
  };

  if (Array.isArray(pythonPayload.faq_sources) && pythonPayload.faq_sources.length) {
    responsePayload.faq_sources = pythonPayload.faq_sources;
  }

  // Preserve search_metadata from Python chatbot for future AI insights dashboard
  if (
    pythonPayload.search_metadata !== undefined &&
    pythonPayload.search_metadata !== null
  ) {
    responsePayload.search_metadata = pythonPayload.search_metadata;
  }

  return responsePayload;
};

module.exports = {
  DEFAULT_MESSAGES,
  shouldQueryDbForStatus,
  resolveFinalStatus,
  buildChatApiResponse,
  buildFallbackResponse,
};
