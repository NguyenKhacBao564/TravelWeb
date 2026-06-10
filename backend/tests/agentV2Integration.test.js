/**
 * Tests for Agent V2 integration (Phase 2B).
 *
 * Tests the response mapper and the feature-flagged controller integration.
 * All HTTP/DB dependencies are mocked — no real network calls.
 */
const test = require("node:test");
const assert = require("node:assert/strict");

// ---------------------------------------------------------------------------
// agentV2ResponseMapper tests
// ---------------------------------------------------------------------------

const {
  mapAgentV2ToFrontend,
  buildFallback,
  mapAgentStatus,
  extractTourList,
  extractFaqSources,
} = require("../services/agentV2ResponseMapper");

test("mapAgentStatus maps success → success", () => {
  assert.equal(mapAgentStatus("success"), "success");
});

test("mapAgentStatus maps no_results → no_results", () => {
  assert.equal(mapAgentStatus("no_results"), "no_results");
});

test("mapAgentStatus maps missing_info → missing_info", () => {
  assert.equal(mapAgentStatus("missing_info"), "missing_info");
});

test("mapAgentStatus maps faq → faq", () => {
  assert.equal(mapAgentStatus("faq"), "faq");
});

test("mapAgentStatus maps fallback → faq", () => {
  assert.equal(mapAgentStatus("fallback"), "faq");
});

test("mapAgentStatus maps error → ai_unavailable", () => {
  assert.equal(mapAgentStatus("error"), "ai_unavailable");
});

test("mapAgentStatus maps unknown → ai_unavailable", () => {
  assert.equal(mapAgentStatus("something_else"), "ai_unavailable");
  assert.equal(mapAgentStatus(null), "ai_unavailable");
  assert.equal(mapAgentStatus(undefined), "ai_unavailable");
});

test("extractTourList extracts tours from data.tours", () => {
  const tours = [{ tour_id: "T1" }, { tour_id: "T2" }];
  assert.deepEqual(extractTourList({ tours }), tours);
});

test("extractTourList extracts from top-level array", () => {
  const tours = [{ tour_id: "T1" }];
  assert.deepEqual(extractTourList(tours), tours);
});

test("extractTourList returns empty array for null/undefined", () => {
  assert.deepEqual(extractTourList(null), []);
  assert.deepEqual(extractTourList(undefined), []);
  assert.deepEqual(extractTourList({}), []);
});

test("buildFallback returns stable shape", () => {
  const fb = buildFallback();
  assert.equal(fb.status, "ai_unavailable");
  assert.ok(fb.message.length > 0);
  assert.deepEqual(fb.entities, {});
  assert.deepEqual(fb.tourlist, []);
  assert.deepEqual(fb.missing_fields, []);
  assert.deepEqual(fb.faq_sources, []);
  assert.equal(fb.fallback_used, true);
});

test("mapAgentV2ToFrontend maps full success response", () => {
  const agentResp = {
    status: "success",
    message: "Tìm thấy 2 tour",
    selected_tool: "search_tours",
    entities: { location: "Đà Lạt", price_max: 5000000 },
    tool_trace: [
      {
        step: 1,
        selected_tool: "search_tours",
        tool_status: "success",
        latency_ms: 123.4,
        error_type: null,
        result_summary: "search_tours returned 2 tour(s)",
      },
    ],
    data: {
      total: 2,
      tours: [
        { tour_id: "T1", name: "Tour 1" },
        { tour_id: "T2", name: "Tour 2" },
      ],
      search_metadata: { has_filters: true },
    },
  };

  const result = mapAgentV2ToFrontend(agentResp);

  assert.equal(result.status, "success");
  assert.equal(result.message, "Tìm thấy 2 tour");
  assert.equal(result.response, "Tìm thấy 2 tour");
  assert.deepEqual(result.entities, { location: "Đà Lạt", price_max: 5000000 });
  assert.deepEqual(result.tourlist, [
    { tour_id: "T1", name: "Tour 1" },
    { tour_id: "T2", name: "Tour 2" },
  ]);
  assert.deepEqual(result.search_metadata.selected_tool, "search_tours");
  assert.deepEqual(result.search_metadata.total, 2);
  assert.equal(result.fallback_used, false);
  assert.ok(Array.isArray(result.tool_trace));
  assert.equal(result.tool_trace[0].step, 1);
  assert.equal(result.tool_trace[0].selected_tool, "search_tours");
  assert.equal(result.tool_trace[0].tool_status, "success");
  assert.equal(result.tool_trace[0].error_type, null);
});

test("mapAgentV2ToFrontend maps no_results status", () => {
  const result = mapAgentV2ToFrontend({
    status: "no_results",
    message: "Không tìm thấy tour",
    selected_tool: "search_tours",
    entities: {},
    tool_trace: [],
    data: { total: 0, tours: [] },
  });

  assert.equal(result.status, "no_results");
  assert.equal(result.tourlist.length, 0);
});

test("extractFaqSources maps hits to faq_sources", () => {
  const sources = extractFaqSources({
    data: {
      hits: [
        {
          title: "Hủy tour?",
          snippet: "Có thể hủy trước 7 ngày.",
          score: 0.85,
          source: "faq_metadata:1",
          tags: ["huy-tour"],
        },
      ],
    },
  });

  assert.equal(sources.length, 1);
  assert.equal(sources[0].question, "Hủy tour?");
  assert.equal(sources[0].answer, "Có thể hủy trước 7 ngày.");
  assert.equal(sources[0].score, 0.85);
  assert.deepEqual(sources[0].tags, ["huy-tour"]);
});

test("mapAgentV2ToFrontend maps faq_retrieval hits to faq_sources", () => {
  const result = mapAgentV2ToFrontend({
    status: "faq",
    message: "TourGuide là hướng dẫn viên du lịch.",
    selected_tool: "faq_retrieval",
    route_source: "deterministic",
    entities: {},
    tool_trace: [
      {
        step: 1,
        selected_tool: "faq_retrieval",
        tool_status: "success",
        latency_ms: 42.0,
        error_type: null,
        result_summary: "faq_retrieval returned 1 hit(s)",
      },
    ],
    data: {
      hits: [
        {
          title: "TourGuide là gì?",
          snippet: "TourGuide là hướng dẫn viên du lịch.",
          score: 0.9,
          source: "faq_metadata:0",
        },
      ],
    },
  });

  assert.equal(result.status, "faq");
  assert.equal(result.faq_sources.length, 1);
  assert.equal(result.faq_sources[0].question, "TourGuide là gì?");
  assert.equal(result.search_metadata.selected_tool, "faq_retrieval");
  assert.equal(result.search_metadata.route_source, "deterministic");
  assert.ok(Array.isArray(result.tool_trace));
  assert.equal(result.tool_trace[0].selected_tool, "faq_retrieval");
});

test("mapAgentV2ToFrontend maps booking_policy_lookup hits to faq_sources", () => {
  const result = mapAgentV2ToFrontend({
    status: "faq",
    message: "Có thể hủy tour trước 7 ngày.",
    selected_tool: "booking_policy_lookup",
    route_source: "deterministic",
    entities: {},
    tool_trace: [],
    data: {
      policy_category: "cancellation",
      hits: [
        {
          title: "Hủy tour được không?",
          snippet: "Có thể hủy tour trước 7 ngày.",
          score: 0.8,
          source: "faq_metadata:2",
        },
      ],
    },
  });

  assert.equal(result.status, "faq");
  assert.equal(result.faq_sources.length, 1);
  assert.equal(result.faq_sources[0].answer, "Có thể hủy tour trước 7 ngày.");
  assert.equal(result.search_metadata.selected_tool, "booking_policy_lookup");
});

test("mapAgentV2ToFrontend maps fallback status to faq", () => {
  const result = mapAgentV2ToFrontend({
    status: "fallback",
    message: "Chào bạn!",
    selected_tool: "fallback_response",
    entities: {},
    tool_trace: [],
    data: {
      message: "Chào bạn!",
      suggestions: ["Tìm tour Đà Lạt"],
    },
  });

  assert.equal(result.status, "faq");
  assert.equal(result.fallback_used, false);
});

test("mapAgentV2ToFrontend maps error to ai_unavailable with fallback_used=true", () => {
  const result = mapAgentV2ToFrontend({
    status: "error",
    message: "",
    selected_tool: "search_tours",
    entities: {},
    tool_trace: [],
    data: null,
  });

  assert.equal(result.status, "ai_unavailable");
  assert.equal(result.fallback_used, true);
});

test("mapAgentV2ToFrontend returns fallback for null/undefined input", () => {
  assert.equal(mapAgentV2ToFrontend(null).status, "ai_unavailable");
  assert.equal(mapAgentV2ToFrontend(undefined).status, "ai_unavailable");
});

test("mapAgentV2ToFrontend omits tool_trace if not an array", () => {
  const result = mapAgentV2ToFrontend({
    status: "success",
    message: "OK",
    tool_trace: "not an array",
    data: {},
  });
  assert.ok(!result.hasOwnProperty("tool_trace"));
});

test("mapAgentV2ToFrontend sanitizes tool_trace entries", () => {
  const result = mapAgentV2ToFrontend({
    status: "success",
    message: "OK",
    tool_trace: [
      {
        step: 1,
        selected_tool: "search_tours",
        tool_status: "error",
        latency_ms: 50.1,
        error_type: "timeout",
        result_summary: "search_tours failed: timeout",
        // These fields should be stripped
        raw_stack_trace: "Error: boom",
        internal_data: { secret: "xyz" },
      },
    ],
    data: {},
  });

  assert.equal(result.tool_trace[0].error_type, "timeout");
  assert.ok(!result.tool_trace[0].hasOwnProperty("raw_stack_trace"));
  assert.ok(!result.tool_trace[0].hasOwnProperty("internal_data"));
});

test("mapAgentV2ToFrontend preserves search_metadata sub-fields", () => {
  const result = mapAgentV2ToFrontend({
    status: "success",
    message: "OK",
    selected_tool: "search_tours",
    entities: {},
    tool_trace: [],
    data: {
      total: 5,
      tours: [],
      search_metadata: {
        has_filters: true,
        location: "Nha Trang",
        date_start: "2025-07-01",
      },
    },
  });

  assert.equal(result.search_metadata.selected_tool, "search_tours");
  assert.equal(result.search_metadata.total, 5);
  assert.equal(result.search_metadata.has_filters, true);
  assert.equal(result.search_metadata.location, "Nha Trang");
});

// ---------------------------------------------------------------------------
// fetchPythonAgentChatV2 unit tests (mock httpx via axios mock)
// ---------------------------------------------------------------------------

const { fetchPythonAgentChatV2 } = require("../services/pythonChatbotClient");

test("fetchPythonAgentChatV2 returns ok=true on 200", async () => {
  const mockResp = { status: 200, data: { status: "success", message: "OK" } };
  const mockHttpClient = { post: async () => mockResp };

  const result = await fetchPythonAgentChatV2("hello", {
    httpClient: mockHttpClient,
    url: "http://localhost:8000/agent/chat-v2",
    requestId: "req-abc",
  });

  assert.equal(result.status, "success");
  assert.equal(result.message, "OK");
  assert.equal(mockResp.data, result);
});

test("fetchPythonAgentChatV2 forwards X-Request-ID header", async () => {
  let capturedHeaders = {};
  const mockHttpClient = {
    post: async (_url, _body, _opts) => {
      capturedHeaders = _opts.headers || {};
      return { status: 200, data: { status: "success" } };
    },
  };

  await fetchPythonAgentChatV2("hello", {
    httpClient: mockHttpClient,
    requestId: "req-xyz",
  });

  assert.equal(capturedHeaders["X-Request-ID"], "req-xyz");
});

test("fetchPythonAgentChatV2 returns error_type=timeout on timeout", async () => {
  const mockHttpClient = {
    post: async () => {
      const err = new Error("timed out");
      err.code = "ETIMEDOUT";
      throw err;
    },
  };

  const result = await fetchPythonAgentChatV2("hello", { httpClient: mockHttpClient });

  assert.equal(result.ok, false);
  assert.equal(result.error_type, "timeout");
});

test("fetchPythonAgentChatV2 returns error_type=connection_error on ECONNREFUSED", async () => {
  const mockHttpClient = {
    post: async () => {
      const err = new Error("connect ECONNREFUSED");
      err.code = "ECONNREFUSED";
      throw err;
    },
  };

  const result = await fetchPythonAgentChatV2("hello", { httpClient: mockHttpClient });

  assert.equal(result.ok, false);
  assert.equal(result.error_type, "connection_error");
});

test("fetchPythonAgentChatV2 returns error_type=auth_error on HTTP 401", async () => {
  const mockHttpClient = {
    post: async () => {
      const err = new Error("Unauthorized");
      err.response = { status: 401 };
      throw err;
    },
  };

  const result = await fetchPythonAgentChatV2("hello", { httpClient: mockHttpClient });

  assert.equal(result.ok, false);
  assert.equal(result.error_type, "auth_error");
});

test("fetchPythonAgentChatV2 returns error_type=auth_error on HTTP 403", async () => {
  const mockHttpClient = {
    post: async () => {
      const err = new Error("Forbidden");
      err.response = { status: 403 };
      throw err;
    },
  };

  const result = await fetchPythonAgentChatV2("hello", { httpClient: mockHttpClient });

  assert.equal(result.ok, false);
  assert.equal(result.error_type, "auth_error");
});

test("fetchPythonAgentChatV2 returns error_type=server_error on HTTP 500", async () => {
  const mockHttpClient = {
    post: async () => {
      const err = new Error("Internal error");
      err.response = { status: 500 };
      throw err;
    },
  };

  const result = await fetchPythonAgentChatV2("hello", { httpClient: mockHttpClient });

  assert.equal(result.ok, false);
  assert.equal(result.error_type, "server_error");
});

// ---------------------------------------------------------------------------
// Feature flag integration tests (createGetRespondChat factory)
// ---------------------------------------------------------------------------

const { createGetRespondChat } = require("../controller/chatController");

const createMockResponse = () => {
  const response = {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
  return response;
};

test("createGetRespondChat: legacy path used by default (agentV2Enabled not set)", async () => {
  let legacyCalled = false;

  const controller = createGetRespondChat({
    fetchPythonChatbotResponse: async () => {
      legacyCalled = true;
      return {
        status: "success",
        message: "Legacy ok",
        entities: { location: "Đà Lạt" },
        tours: [],
        missing_fields: [],
        faq_sources: [],
        search_metadata: null,
      };
    },
    searchToursByChatEntities: async () => ({
      entities: { location: "Đà Lạt" },
      tourlist: [{ tour_id: "T1", name: "Tour 1" }],
      hasSearchFilters: true,
      queryExecuted: true,
    }),
    buildFallback: () => ({ status: "ai_unavailable" }),
    buildAgentV2Fallback: () => ({ status: "ai_unavailable" }),
  });

  const req = { body: { query: "Tìm tour Đà Lạt" }, requestId: "req-001" };
  const res = createMockResponse();

  await controller(req, res);

  assert.equal(legacyCalled, true, "Legacy path should be called when agentV2Enabled is false");
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.status, "success");
});

test("createGetRespondChat: agent-v2 path called when agentV2Enabled=true", async () => {
  let agentV2Called = false;
  let legacyCalled = false;

  const controller = createGetRespondChat({
    agentV2Enabled: true,
    fetchPythonChatbotResponse: async () => {
      legacyCalled = true;
      return { status: "success", message: "Legacy" };
    },
    fetchAgentV2Response: async () => {
      agentV2Called = true;
      return {
        ok: true,
        status: "success",
        message: "Agent V2 works!",
        selected_tool: "search_tours",
        entities: { location: "Nha Trang" },
        tool_trace: [{ step: 1, selected_tool: "search_tours", tool_status: "success", latency_ms: 50, error_type: null }],
        data: { total: 1, tours: [{ tour_id: "T1" }] },
      };
    },
    mapAgentV2Response: (raw) => mapAgentV2ToFrontend(raw),
    buildFallback: () => ({ status: "ai_unavailable" }),
    buildAgentV2Fallback: () => buildFallback(),
  });

  const req = { body: { query: "Tìm tour Nha Trang" }, requestId: "req-002" };
  const res = createMockResponse();

  await controller(req, res);

  assert.equal(agentV2Called, true, "Agent V2 should be called when agentV2Enabled=true");
  assert.equal(legacyCalled, false, "Legacy should NOT be called when agentV2Enabled=true");
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.status, "success");
  assert.equal(res.body.tourlist.length, 1);
  assert.ok(Array.isArray(res.body.tool_trace));
});

test("createGetRespondChat: agent-v2 error returns HTTP 200 fallback", async () => {
  const controller = createGetRespondChat({
    agentV2Enabled: true,
    fetchAgentV2Response: async () => ({
      ok: false,
      error_type: "connection_error",
      message: "Cannot connect",
    }),
    mapAgentV2Response: (raw) => mapAgentV2ToFrontend(raw),
    buildFallback: () => ({ status: "ai_unavailable" }),
    buildAgentV2Fallback: () => buildFallback(),
  });

  const req = { body: { query: "Tìm tour" }, requestId: "req-003" };
  const res = createMockResponse();

  await controller(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.status, "ai_unavailable");
  assert.equal(res.body.fallback_used, true);
});

test("createGetRespondChat: agent-v2 tourlist maps to frontend-compatible shape", async () => {
  const controller = createGetRespondChat({
    agentV2Enabled: true,
    fetchAgentV2Response: async () => ({
      ok: true,
      status: "success",
      message: "Tìm thấy 3 tour",
      selected_tool: "search_tours",
      entities: { location: "Phú Quốc" },
      tool_trace: [
        { step: 1, selected_tool: "search_tours", tool_status: "success", latency_ms: 80, error_type: null },
      ],
      data: {
        total: 3,
        tours: [
          { tour_id: "PQ1", name: "Phú Quốc 3N" },
          { tour_id: "PQ2", name: "Phú Quốc 4N" },
        ],
        search_metadata: { location: "Phú Quốc" },
      },
    }),
    mapAgentV2Response: (raw) => mapAgentV2ToFrontend(raw),
    buildFallback: () => ({ status: "ai_unavailable" }),
    buildAgentV2Fallback: () => buildFallback(),
  });

  const req = { body: { query: "Tour Phú Quốc" }, requestId: "req-004" };
  const res = createMockResponse();

  await controller(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.status, "success");
  assert.equal(res.body.tourlist.length, 2);
  assert.equal(res.body.entities.location, "Phú Quốc");
  assert.equal(res.body.search_metadata.selected_tool, "search_tours");
  assert.equal(res.body.search_metadata.total, 3);
  assert.ok(Array.isArray(res.body.tool_trace));
  assert.equal(res.body.tool_trace[0].tool_status, "success");
});
