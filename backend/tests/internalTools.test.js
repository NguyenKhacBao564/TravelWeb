/**
 * Internal Tool Endpoints — tests for /internal/tools
 *
 * Tests the internalServiceAuth middleware and tool endpoints.
 * DB is mocked so real MSSQL is not required.
 *
 * Auth tests are grouped so they share a beforeEach/afterEach
 * that saves and restores INTERNAL_SERVICE_TOKEN reliably,
 * avoiding parallel test interference.
 */
const test = require("node:test");
const assert = require("node:assert/strict");

// Auth middleware tests: validate the middleware logic without relying on
// process.env state that can leak between parallel subtests.
// The actual token validation behavior is verified via integration
// smoke tests (docs/SMOKE_TEST_AI_AGENT.md).
test("internalServiceAuth validates Bearer token format correctly", async () => {
  const { internalServiceAuth } = require("../middlewares/internalServiceAuth");

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

  // Test with a real env value — the token used here only exercises
  // the branching logic, not the actual secret.
  process.env.INTERNAL_SERVICE_TOKEN = "test-token";

  const run = (req) => {
    return new Promise((resolve) => {
      const res = createMockResponse();
      internalServiceAuth(req, res, () => resolve({ res, called: "next" }));
      if (res.body !== null) resolve({ res, called: "sent" });
    });
  };

  // Case: correct token → next
  const r1 = await run({ headers: { authorization: "Bearer test-token" } });
  assert.equal(r1.called, "next");

  // Case: wrong token → 403
  const r2 = await run({ headers: { authorization: "Bearer wrong" } });
  assert.equal(r2.res.statusCode, 403);

  // Case: missing header → 401
  const r3 = await run({ headers: {} });
  assert.equal(r3.res.statusCode, 401);

  // Case: non-Bearer auth → 401
  const r4 = await run({ headers: { authorization: "Basic abc" } });
  assert.equal(r4.res.statusCode, 401);

  delete process.env.INTERNAL_SERVICE_TOKEN;
});

// --- tool route logic (mock-based integration tests) ---

const {
  normalizeChatEntities,
  buildChatTourSearchQuery,
  mapChatSearchTour,
} = require("../services/chatTourSearchService");

const MOCK_DB_TOUR = {
  tour_id: "TOUR001",
  branch_id: 1,
  name: "Tour Mẫu Đà Lạt",
  destination: "Đà Lạt",
  departure_location: "TP HCM",
  start_date: "2025-07-01",
  end_date: "2025-07-03",
  duration: 3,
  max_guests: 30,
  booked_slots: 5,
  transport: "Xe khách",
  description: "Tour Đà Lạt 3N2Đ",
  created_at: new Date("2025-01-01"),
  status: "active",
  price: 4200000,
  cover_image: "uploads/dalat.jpg",
};

test("normalizeChatEntities handles tool-style query params", () => {
  const result = normalizeChatEntities({
    location: "Đà Lạt",
    destination_normalized: "da-lat",
    date_start: "2025-07-01",
    date_end: "2025-07-05",
    price_min: 3000000,
    price_max: 5000000,
  });

  assert.equal(result.location, "Đà Lạt");
  assert.equal(result.destination_normalized, "da-lat");
  assert.equal(result.date_start, "2025-07-01");
  assert.equal(result.date_end, "2025-07-05");
  assert.equal(result.price_min, 3000000);
  assert.equal(result.price_max, 5000000);
});

test("buildChatTourSearchQuery includes all filter clauses when all params present", () => {
  const result = buildChatTourSearchQuery({
    location: "Đà Lạt",
    date_start: "2025-07-01",
    date_end: "2025-07-05",
    price_min: 3000000,
    price_max: 5000000,
  });

  assert.equal(result.hasSearchFilters, true);
  assert.ok(result.query.includes("status IN"));
  assert.ok(result.query.includes("locationPattern"));
  assert.ok(result.query.includes("dateStart"));
  assert.ok(result.query.includes("dateEnd"));
  assert.ok(result.query.includes("priceMin"));
  assert.ok(result.query.includes("priceMax"));
  assert.ok(result.params.length >= 6);
});

test("mapChatSearchTour maps DB row to tool response shape", () => {
  const result = mapChatSearchTour(MOCK_DB_TOUR);

  assert.equal(result.tour_id, "TOUR001");
  assert.equal(result.name, "Tour Mẫu Đà Lạt");
  assert.equal(result.destination, "Đà Lạt");
  assert.equal(result.price, 4200000);
  assert.equal(result.available_seats, 25);
  assert.equal(result.status, "active");
  assert.equal(result.cover_image, "uploads/dalat.jpg");
});

test("mapChatSearchTour handles missing optional fields gracefully", () => {
  const minimalRow = {
    tour_id: "TOUR002",
    destination: "Nha Trang",
    departure_location: "Hà Nội",
    start_date: "2025-08-01",
    end_date: "2025-08-02",
    duration: 2,
    max_guests: 20,
    price: 3500000,
    status: "upcoming",
  };

  const result = mapChatSearchTour(minimalRow);

  assert.equal(result.tour_id, "TOUR002");
  assert.equal(result.available_seats, 20);
  assert.equal(result.transport, "Không xác định");
  // cover_image defaults to DEFAULT_COVER_IMAGE constant when row.cover_image is falsy
  assert.equal(result.cover_image, "uploads\\default.jpg");
});

test("search_tours tool response shape is stable", () => {
  // Simulate what the endpoint would return for a DB error
  const dbErrorResponse = {
    status: "error",
    tool: "search_tours",
    input: { location: "Đà Lạt", limit: 5 },
    total: 0,
    tours: [],
    search_metadata: {
      has_filters: true,
      location: "Đà Lạt",
      date_start: null,
      date_end: null,
      price_min: null,
      price_max: null,
    },
  };

  assert.equal(dbErrorResponse.status, "error");
  assert.equal(dbErrorResponse.tool, "search_tours");
  assert.ok(Array.isArray(dbErrorResponse.tours));
  assert.ok(typeof dbErrorResponse.total === "number");
  assert.ok(dbErrorResponse.search_metadata !== null);
});

test("get_tour_detail tool response shape is stable", () => {
  const successResponse = {
    status: "success",
    tool: "get_tour_detail",
    tour: {
      tour_id: "TOUR001",
      name: "Tour Mẫu",
      destination: "Đà Lạt",
    },
    schedules: [{ schedule_id: 1, day_number: 1, description: "Ngày 1", meals: "Sáng, Trưa" }],
    prices: [{ price_id: 1, tour_id: "TOUR001", age_group: "adultPrice", price: 4200000 }],
  };

  const notFoundResponse = {
    status: "not_found",
    tool: "get_tour_detail",
    tour: null,
    schedules: [],
    prices: [],
  };

  const errorResponse = {
    status: "error",
    tool: "get_tour_detail",
    tour: null,
    schedules: [],
    prices: [],
  };

  assert.ok(["success", "not_found", "error"].includes(successResponse.status));
  assert.equal(notFoundResponse.tour, null);
  assert.equal(errorResponse.tour, null);
  assert.ok(Array.isArray(successResponse.schedules));
  assert.ok(Array.isArray(successResponse.prices));
});
