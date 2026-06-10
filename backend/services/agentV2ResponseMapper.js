/**
 * Agent V2 Response Mapper
 *
 * Converts an AgentResponse (from /agent/chat-v2) into the frontend-compatible
 * response contract expected by the React ChatBox.
 *
 * Frontend contract fields:
 *   status, message, response, entities, missing_fields,
 *   tourlist, faq_sources, search_metadata, fallback_used, tool_trace
 *
 * AgentResponse fields:
 *   status, message, selected_tool, entities, tool_trace, data
 *
 * Safety guarantees:
 * - Only structured tool_trace (not chain-of-thought) is forwarded.
 * - stack traces and raw error messages are never forwarded.
 * - Contract violations result in a safe fallback response.
 */

/** Map AgentResponse.status → frontend-compatible status. */
const mapAgentStatus = (agentStatus) => {
  switch (agentStatus) {
    case "success":
      return "success";
    case "no_results":
      return "no_results";
    case "missing_info":
      return "missing_info";
    case "faq":
      return "faq";
    case "fallback":
      return "faq";
    case "error":
      return "ai_unavailable";
    default:
      return "ai_unavailable";
  }
};

/** Extract tourlist from AgentResponse.data, normalizing various shapes. */
const extractTourList = (data) => {
  if (!data || typeof data !== "object") return [];

  // Express internal tool shape: { tours: [...] }
  if (Array.isArray(data.tours)) return data.tours;

  // Generic shape: top-level array
  if (Array.isArray(data)) return data;

  return [];
};

/** Build search_metadata from agent data, safe to forward. */
const buildSearchMetadata = (agentResponse) => {
  const meta = {
    selected_tool: agentResponse.selected_tool || null,
  };

  if (agentResponse.data && typeof agentResponse.data === "object") {
    const d = agentResponse.data;
    if (d.search_metadata && typeof d.search_metadata === "object") {
      Object.assign(meta, d.search_metadata);
    }
    if (typeof d.total === "number") {
      meta.total = d.total;
    }
  }

  return meta;
};

/**
 * Map an AgentResponse to the frontend contract.
 *
 * @param {object} agentResponse — raw response from /agent/chat-v2
 * @returns {object} frontend-compatible response
 */
const mapAgentV2ToFrontend = (agentResponse) => {
  if (!agentResponse || typeof agentResponse !== "object") {
    return buildFallback();
  }

  const status = mapAgentStatus(agentResponse.status);
  const message =
    typeof agentResponse.message === "string" && agentResponse.message.trim()
      ? agentResponse.message.trim()
      : buildDefaultMessage(status);
  const entities =
    agentResponse.entities && typeof agentResponse.entities === "object"
      ? agentResponse.entities
      : {};
  const tourlist = extractTourList(agentResponse.data);
  const searchMetadata = buildSearchMetadata(agentResponse);

  // Forward tool_trace only if it is a structured array (never raw strings)
  let toolTrace = undefined;
  if (Array.isArray(agentResponse.tool_trace)) {
    toolTrace = agentResponse.tool_trace.map((entry) => ({
      step: entry.step,
      selected_tool: entry.selected_tool,
      tool_status: entry.tool_status,
      latency_ms: entry.latency_ms,
      error_type: entry.error_type || null,
      result_summary: entry.result_summary || null,
    }));
  }

  const result = {
    status,
    message,
    response: message,
    entities,
    missing_fields: [],
    tourlist,
    faq_sources: [],
    search_metadata: searchMetadata,
    fallback_used: status === "ai_unavailable",
  };

  if (toolTrace !== undefined) {
    result.tool_trace = toolTrace;
  }

  return result;
};

/** Build the standard fallback response for errors / unmappable responses. */
const buildFallback = () => ({
  status: "ai_unavailable",
  message:
    "Trợ lý AI hiện chưa phản hồi được. Bạn vẫn có thể tìm tour bằng bộ lọc thông thường hoặc thử lại sau.",
  response:
    "Trợ lý AI hiện chưa phản hồi được. Bạn vẫn có thể tìm tour bằng bộ lọc thông thường hoặc thử lại sau.",
  entities: {},
  missing_fields: [],
  tourlist: [],
  faq_sources: [],
  search_metadata: null,
  fallback_used: true,
});

const buildDefaultMessage = (status) => {
  const defaults = {
    success: "Mình đã tìm thấy một số tour phù hợp với yêu cầu của bạn.",
    no_results:
      "Xin lỗi, hiện tại chưa có tour phù hợp với yêu cầu của bạn. Bạn có thể thử đổi địa điểm, thời gian hoặc mức giá.",
    missing_info:
      "Mình cần thêm thông tin để tìm tour phù hợp cho bạn.",
    faq: "Mình đã tìm thấy thông tin hỗ trợ cho câu hỏi của bạn.",
    ai_unavailable:
      "Trợ lý AI hiện chưa phản hồi được. Bạn vẫn có thể tìm tour bằng bộ lọc thông thường hoặc thử lại sau.",
  };
  return (
    defaults[status] ||
    "Trợ lý AI hiện chưa phản hồi được. Bạn vẫn có thể tìm tour bằng bộ lọc thông thường hoặc thử lại sau."
  );
};

module.exports = {
  mapAgentV2ToFrontend,
  buildFallback,
  mapAgentStatus,
  extractTourList,
};
