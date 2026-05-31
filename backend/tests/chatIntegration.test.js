const test = require("node:test");
const assert = require("node:assert/strict");

const { createGetRespondChat, createGetChatHealth } = require("../controller/chatController");
const {
  fetchPythonChatbotResponse,
  fetchPythonChatbotHealth,
  normalizeUserId,
} = require("../services/pythonChatbotClient");
const {
  buildChatTourSearchQuery,
  normalizeChatEntities,
} = require("../services/chatTourSearchService");

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

const SAMPLE_DB_TOUR = {
  tour_id: "TOUR1001",
  name: "Tour Da Lat",
  destination: "Đà Lạt",
  start_date: "2025-06-10",
  end_date: "2025-06-12",
  duration: 3,
  price: 4200000,
  prices: 4200000,
};

test("missing_info preserves message and returns no tours", async () => {
  let dbWasCalled = false;

  const getRespondChat = createGetRespondChat({
    fetchPythonChatbotResponse: async () => ({
      status: "missing_info",
      message: "Bạn muốn đi đâu và khi nào?",
      entities: { location: "Đà Lạt" },
      missing_fields: ["date_start"],
      faq_sources: [],
    }),
    searchToursByChatEntities: async () => {
      dbWasCalled = true;
      return { entities: {}, tourlist: [] };
    },
  });

  const response = createMockResponse();

  await getRespondChat({ body: { query: "Tôi muốn đi du lịch" } }, response);

  assert.equal(response.statusCode, 200);
  assert.equal(response.body.status, "missing_info");
  assert.equal(response.body.message, "Bạn muốn đi đâu và khi nào?");
  assert.deepEqual(response.body.tourlist, []);
  assert.equal(dbWasCalled, false);
});

test("controller forwards stable user_id to Python chatbot client", async () => {
  let capturedQuery;
  let capturedOptions;

  const getRespondChat = createGetRespondChat({
    fetchPythonChatbotResponse: async (query, options) => {
      capturedQuery = query;
      capturedOptions = options;
      return {
        status: "missing_info",
        message: "Bạn muốn đi đâu?",
        entities: {},
        missing_fields: ["location"],
        faq_sources: [],
      };
    },
    searchToursByChatEntities: async () => {
      throw new Error("missing_info should not query DB");
    },
  });

  const response = createMockResponse();

  await getRespondChat(
    { body: { query: "3tr", user_id: " web_session_123 " } },
    response
  );

  assert.equal(response.statusCode, 200);
  assert.equal(capturedQuery, "3tr");
  assert.deepEqual(capturedOptions, { userId: "web_session_123" });
});

test("Python chatbot client sends user_id when provided", async () => {
  let postedBody;
  let postedConfig;

  const httpClient = {
    post: async (url, body, config) => {
      postedBody = body;
      postedConfig = config;
      return {
        data: {
          status: "missing_info",
          message: "Bạn muốn đi đâu?",
          entities: {},
          missing_fields: ["location"],
          tours: [],
          faq_sources: [],
        },
      };
    },
  };

  const payload = await fetchPythonChatbotResponse("3tr", {
    httpClient,
    url: "http://python.test/chat",
    timeout: 1234,
    userId: " web_session_456 ",
  });

  assert.equal(payload.status, "missing_info");
  assert.deepEqual(postedBody, {
    query: "3tr",
    user_id: "web_session_456",
  });
  assert.deepEqual(postedConfig, { timeout: 1234 });
});

test("normalizeUserId trims and limits invalid values", () => {
  assert.equal(normalizeUserId(" user_1 "), "user_1");
  assert.equal(normalizeUserId("   "), undefined);
  assert.equal(normalizeUserId(null), undefined);
  assert.equal(normalizeUserId("x".repeat(200)).length, 128);
});

test("faq does not trigger DB search and returns faq sources", async () => {
  let dbWasCalled = false;

  const getRespondChat = createGetRespondChat({
    fetchPythonChatbotResponse: async () => ({
      status: "faq",
      message: "Bạn có thể thanh toán qua VNPay.",
      entities: {},
      missing_fields: [],
      faq_sources: [{ title: "Payments FAQ" }],
    }),
    searchToursByChatEntities: async () => {
      dbWasCalled = true;
      return { entities: {}, tourlist: [] };
    },
  });

  const response = createMockResponse();

  await getRespondChat({ body: { query: "Công ty hỗ trợ thanh toán gì?" } }, response);

  assert.equal(response.statusCode, 200);
  assert.equal(response.body.status, "faq");
  assert.equal(response.body.message, "Bạn có thể thanh toán qua VNPay.");
  assert.deepEqual(response.body.faq_sources, [{ title: "Payments FAQ" }]);
  assert.equal(dbWasCalled, false);
});

test("partial_search with location and time keeps partial_search and returns DB tours", async () => {
  let receivedEntities;

  const getRespondChat = createGetRespondChat({
    fetchPythonChatbotResponse: async () => ({
      status: "partial_search",
      message: "Mình đang tìm tour Đà Lạt theo thời gian bạn đã cung cấp.",
      entities: {
        location: "Đà Lạt",
        date_start: "2025-06-10",
        date_end: "2025-06-15",
      },
      missing_fields: ["price_max"],
      faq_sources: [],
    }),
    searchToursByChatEntities: async (entities) => {
      receivedEntities = entities;
      return { entities, tourlist: [SAMPLE_DB_TOUR] };
    },
  });

  const response = createMockResponse();

  await getRespondChat({ body: { query: "Tour Đà Lạt giữa tháng 6" } }, response);

  assert.equal(response.statusCode, 200);
  assert.equal(response.body.status, "partial_search");
  assert.equal(
    response.body.message,
    "Mình đã tìm thấy một số tour dựa trên thông tin hiện có. Bạn có thể thêm thời gian hoặc ngân sách để lọc sát hơn."
  );
  assert.deepEqual(receivedEntities, {
    location: "Đà Lạt",
    date_start: "2025-06-10",
    date_end: "2025-06-15",
  });
  assert.deepEqual(response.body.tourlist, [SAMPLE_DB_TOUR]);
});

test("partial_search query builder supports location and price filters", () => {
  const searchPlan = buildChatTourSearchQuery({
    destination_normalized: "Phú Quốc",
    price_min: "3000000",
    price_max: "5000000",
  });

  const paramsByName = Object.fromEntries(
    searchPlan.params.map((param) => [param.name, param.value])
  );

  assert.equal(searchPlan.hasSearchFilters, true);
  assert.match(searchPlan.query, /locationPattern/);
  assert.match(searchPlan.query, /tp\.price >= @priceMin/);
  assert.match(searchPlan.query, /tp\.price <= @priceMax/);
  assert.equal(paramsByName.locationPattern, "%Phú Quốc%");
  assert.equal(paramsByName.priceMin, 3000000);
  assert.equal(paramsByName.priceMax, 5000000);
});

test("query builder prefers display location over normalized slug for DB matching", () => {
  const searchPlan = buildChatTourSearchQuery({
    location: "Đà Lạt",
    destination_normalized: "da-lat",
    date_start: "2026-05-01",
    date_end: "2026-05-31",
    price_max: 5000000,
  });

  const paramsByName = Object.fromEntries(
    searchPlan.params.map((param) => [param.name, param.value])
  );

  assert.equal(searchPlan.hasSearchFilters, true);
  assert.equal(paramsByName.locationPattern, "%Đà Lạt%");
});

test("query builder maps known destination slugs when display location is absent", () => {
  const searchPlan = buildChatTourSearchQuery({
    destination_normalized: "phu-yen",
    date_start: "2027-05-01",
    date_end: "2027-05-31",
  });

  const paramsByName = Object.fromEntries(
    searchPlan.params.map((param) => [param.name, param.value])
  );

  assert.equal(searchPlan.hasSearchFilters, true);
  assert.equal(paramsByName.locationPattern, "%Phú Yên%");
});

test("normalizeChatEntities does not turn price_min-only filters into exact price filters", () => {
  const normalizedEntities = normalizeChatEntities({
    location: "Đà Lạt",
    destination_normalized: "da-lat",
    price: "5000000",
    price_min: 5000000,
  });

  assert.equal(normalizedEntities.price_min, 5000000);
  assert.equal(normalizedEntities.price_max, undefined);

  const searchPlan = buildChatTourSearchQuery(normalizedEntities);

  assert.match(searchPlan.query, /tp\.price >= @priceMin/);
  assert.doesNotMatch(searchPlan.query, /tp\.price <= @priceMax/);
});

test("full-search status is finalized from DB results", async () => {
  const getRespondChat = createGetRespondChat({
    fetchPythonChatbotResponse: async () => ({
      status: "success",
      message: "Mình đã hiểu yêu cầu tìm tour Huế.",
      entities: normalizeChatEntities({
        location: "Huế",
        date_start: "2025-06-11",
        price_max: "6000000",
      }),
      missing_fields: [],
      faq_sources: [],
    }),
    searchToursByChatEntities: async (entities) => ({
      entities,
      tourlist: [SAMPLE_DB_TOUR],
    }),
  });

  const response = createMockResponse();

  await getRespondChat({ body: { query: "Tìm tour Huế giá dưới 6 triệu" } }, response);

  assert.equal(response.statusCode, 200);
  assert.equal(response.body.status, "success");
  assert.deepEqual(response.body.tourlist, [SAMPLE_DB_TOUR]);
});

test("Python sample tours do not become final tour truth when DB is empty", async () => {
  const getRespondChat = createGetRespondChat({
    fetchPythonChatbotResponse: async () => ({
      status: "success",
      message: "Mình đã tìm được vài tour mẫu.",
      entities: { location: "Sapa", date_start: "2025-07-01" },
      missing_fields: [],
      tours: [{ tour_id: "PYTHON-SAMPLE-1" }],
      faq_sources: [],
    }),
    searchToursByChatEntities: async (entities) => ({
      entities,
      tourlist: [],
    }),
  });

  const response = createMockResponse();

  await getRespondChat({ body: { query: "Tour Sapa đầu tháng 7" } }, response);

  assert.equal(response.statusCode, 200);
  assert.equal(response.body.status, "no_results");
  assert.deepEqual(response.body.tourlist, []);
  assert.ok(
    !response.body.tourlist.some((tour) => tour.tour_id === "PYTHON-SAMPLE-1")
  );
});

// --- New Phase 1 tests ---

test("unavailable Python chatbot returns stable fallback with HTTP 200", async () => {
  const getRespondChat = createGetRespondChat({
    fetchPythonChatbotResponse: async () => {
      const err = new Error("connect ECONNREFUSED");
      err.code = "ECONNREFUSED";
      throw err;
    },
  });

  const response = createMockResponse();
  await getRespondChat({ body: { query: "Tour Đà Lạt" } }, response);

  assert.equal(response.statusCode, 200);
  assert.equal(response.body.status, "ai_unavailable");
  assert.equal(response.body.fallback_used, true);
  assert.equal(
    response.body.message,
    "Trợ lý AI hiện chưa phản hồi được. Bạn vẫn có thể tìm tour bằng bộ lọc thông thường hoặc thử lại sau."
  );
  assert.deepEqual(response.body.entities, {});
  assert.deepEqual(response.body.tourlist, []);
  assert.deepEqual(response.body.missing_fields, []);
});

test("invalid Python chatbot contract returns stable fallback with HTTP 200", async () => {
  const getRespondChat = createGetRespondChat({
    fetchPythonChatbotResponse: async () => {
      const err = new Error("Unsupported chatbot status: gibberish");
      err.name = "ChatbotContractError";
      throw err;
    },
  });

  const response = createMockResponse();
  await getRespondChat({ body: { query: "Tour Huế" } }, response);

  assert.equal(response.statusCode, 200);
  assert.equal(response.body.status, "ai_unavailable");
  assert.equal(response.body.fallback_used, true);
  assert.deepEqual(response.body.tourlist, []);
});

test("search_metadata is preserved in response when returned by Python", async () => {
  const metadata = {
    query_intent: "find_tour_with_location",
    related_keywords: ["da-lat", "dulich"],
    content_category: "tour_search",
    faq_opportunity: false,
  };

  const getRespondChat = createGetRespondChat({
    fetchPythonChatbotResponse: async () => ({
      status: "success",
      message: "Tìm thấy tour Đà Lạt.",
      entities: { location: "Đà Lạt", destination_normalized: "da-lat" },
      missing_fields: [],
      tours: [],
      faq_sources: [],
      search_metadata: metadata,
    }),
    searchToursByChatEntities: async () => ({
      entities: { location: "Đà Lạt", destination_normalized: "da-lat" },
      tourlist: [SAMPLE_DB_TOUR],
    }),
  });

  const response = createMockResponse();
  await getRespondChat(
    { body: { query: "Tour Đà Lạt", user_id: "test_meta" } },
    response
  );

  assert.equal(response.statusCode, 200);
  assert.equal(response.body.status, "success");
  assert.deepEqual(response.body.search_metadata, metadata);
});

test("search_metadata is absent from response when not returned by Python", async () => {
  const getRespondChat = createGetRespondChat({
    fetchPythonChatbotResponse: async () => ({
      status: "missing_info",
      message: "Bạn muốn đi đâu?",
      entities: {},
      missing_fields: ["location"],
      faq_sources: [],
    }),
  });

  const response = createMockResponse();
  await getRespondChat({ body: { query: "Tìm tour" } }, response);

  assert.equal(response.statusCode, 200);
  assert.equal(response.body.search_metadata, undefined);
});

// --- /chat/health endpoint tests ---

test("health endpoint returns ok when Python chatbot is reachable", async () => {
  const fakeHealthResult = {
    configured: true,
    status: "ok",
    health_url: "http://localhost:8000/health",
    latency_ms: 45,
  };

  const getChatHealth = createGetChatHealth({
    fetchHealth: async () => fakeHealthResult,
  });

  const response = createMockResponse();
  await getChatHealth({}, response);

  assert.equal(response.statusCode, 200);
  assert.equal(response.body.status, "ok");
  assert.equal(response.body.service, "travelweb-chat-integration");
  assert.deepEqual(response.body.python_chatbot, fakeHealthResult);
});

test("health endpoint returns degraded when Python chatbot is unavailable", async () => {
  const fakeHealthResult = {
    configured: true,
    status: "unavailable",
    health_url: "http://localhost:8000/health",
    latency_ms: 3000,
    error: "connection refused",
  };

  const getChatHealth = createGetChatHealth({
    fetchHealth: async () => fakeHealthResult,
  });

  const response = createMockResponse();
  await getChatHealth({}, response);

  assert.equal(response.statusCode, 200);
  assert.equal(response.body.status, "degraded");
  assert.equal(response.body.service, "travelweb-chat-integration");
  assert.equal(response.body.python_chatbot.status, "unavailable");
  assert.equal(response.body.python_chatbot.error, "connection refused");
});

test("fetchPythonChatbotHealth returns ok with latency on success", async () => {
  let capturedUrl;
  let capturedTimeout;

  const httpClient = {
    get: async (url, config) => {
      capturedUrl = url;
      capturedTimeout = config.timeout;
      return { data: { status: "ok" } };
    },
  };

  const result = await fetchPythonChatbotHealth({
    httpClient,
    url: "http://localhost:8000/chat",
    timeout: 5000,
  });

  assert.equal(result.configured, true);
  assert.equal(result.status, "ok");
  assert.equal(capturedUrl, "http://localhost:8000/health");
  assert.equal(capturedTimeout, 5000);
  assert.ok(result.latency_ms >= 0);
});

test("fetchPythonChatbotHealth derives health URL by replacing /chat path", async () => {
  let capturedUrl;

  const httpClient = {
    get: async (url) => {
      capturedUrl = url;
      const err = new Error("connect ECONNREFUSED");
      err.code = "ECONNREFUSED";
      throw err;
    },
  };

  const result = await fetchPythonChatbotHealth({
    httpClient,
    url: "http://custom-host:9000/chat",
  });

  assert.equal(result.health_url, "http://custom-host:9000/health");
  assert.equal(result.status, "unavailable");
  assert.equal(result.error, "connection refused");
});

test("structured log is emitted for successful chat request", async () => {
  const logs = [];

  const getRespondChat = createGetRespondChat({
    fetchPythonChatbotResponse: async () => ({
      status: "missing_info",
      message: "Bạn muốn đi đâu?",
      entities: {},
      missing_fields: ["location"],
      faq_sources: [],
    }),
    log: (msg) => logs.push(JSON.parse(msg)),
  });

  const response = createMockResponse();
  await getRespondChat(
    { body: { query: "Tìm tour", user_id: "log_test_user" } },
    response
  );

  assert.equal(logs.length, 1);
  assert.equal(logs[0].event, "chat_request");
  assert.equal(logs[0].user_id, "log_test_user");
  assert.equal(logs[0].query_len, 8);
  assert.ok(logs[0].python_chatbot_latency_ms >= 0);
  assert.equal(logs[0].db_search_latency_ms, 0);
  assert.ok(logs[0].total_request_latency_ms >= 0);
  assert.equal(logs[0].python_status, "missing_info");
  assert.equal(logs[0].final_status, "missing_info");
  assert.equal(logs[0].tours_count, 0);
  assert.equal(logs[0].fallback_used, false);
});

test("structured log is emitted with fallback_used true on error", async () => {
  const logs = [];

  const getRespondChat = createGetRespondChat({
    fetchPythonChatbotResponse: async () => {
      const err = new Error("timeout");
      err.code = "ETIMEDOUT";
      throw err;
    },
    log: (msg) => logs.push(JSON.parse(msg)),
  });

  const response = createMockResponse();
  await getRespondChat({ body: { query: "Tour Huế" } }, response);

  assert.equal(logs.length, 1);
  assert.equal(logs[0].fallback_used, true);
  assert.equal(logs[0].error_type, "timeout");
  assert.equal(logs[0].final_status, undefined);
});

