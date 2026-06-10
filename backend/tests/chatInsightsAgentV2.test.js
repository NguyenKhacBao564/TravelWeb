/**
 * Tests for Agent V2 analytics metrics (Phase 3B).
 *
 * Tests the extended chatAnalyticsLogger, chatInsightsService, and
 * agentV2ResponseMapper with Agent V2 fields.
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

// ---------------------------------------------------------------------------
// chatInsightsService — pure unit tests (no file I/O)
// ---------------------------------------------------------------------------

const {
  computeP95,
  buildDistribution,
  getInsights,
} = require("../services/chatInsightsService");

// ---------------------------------------------------------------------------
// computeP95 tests
// ---------------------------------------------------------------------------

test("computeP95 returns null for empty array", () => {
  assert.equal(computeP95([]), null);
});

test("computeP95 returns null for single element", () => {
  assert.equal(computeP95([100]), null);
});

test("computeP95 returns correct p95 for small set", () => {
  // 20 values: 1..20, p95 ≈ 19
  const values = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];
  const result = computeP95(values);
  assert.ok(result >= 18 && result <= 20, `Expected 18-20, got ${result}`);
});

test("computeP95 returns correct p95 for skewed set", () => {
  // 100 values mostly 100ms, one outlier 5000ms
  const values = Array.from({ length: 99 }, () => 100).concat([5000]);
  const result = computeP95(values);
  assert.ok(result <= 5000, `Expected <= 5000, got ${result}`);
  assert.ok(result >= 100, `Expected >= 100, got ${result}`);
});

// ---------------------------------------------------------------------------
// buildDistribution tests
// ---------------------------------------------------------------------------

test("buildDistribution sorts by count descending", () => {
  const counter = { a: 5, b: 10, c: 3 };
  const result = buildDistribution(counter);
  const keys = Object.keys(result);
  assert.equal(keys[0], "b"); // count 10
  assert.equal(keys[1], "a"); // count 5
  assert.equal(keys[2], "c"); // count 3
});

test("buildDistribution handles empty counter", () => {
  const result = buildDistribution({});
  assert.deepEqual(result, {});
});

// ---------------------------------------------------------------------------
// getInsights — empty log
// ---------------------------------------------------------------------------

test("getInsights returns all new agent fields when log is empty", () => {
  const result = getInsights({ logPath: "/nonexistent/path.jsonl" });
  assert.equal(result.total_chats, 0);
  assert.equal(result.agent_v2_requests, 0);
  assert.equal(result.agent_v2_rate, 0);
  assert.equal(result.memory_used_count, 0);
  assert.equal(result.memory_used_rate, 0);
  assert.deepEqual(result.selected_tool_distribution, {});
  assert.deepEqual(result.route_source_distribution, {});
  assert.deepEqual(result.tool_status_distribution, {});
  assert.deepEqual(result.tool_error_distribution, {});
  assert.equal(result.total_sessions, 0);
  assert.equal(result.p95_latency_ms, null);
  assert.equal(result.avg_latency_ms, null);
});

// ---------------------------------------------------------------------------
// getInsights — pure unit tests with mock entries array
// ---------------------------------------------------------------------------

// We use internal module state to test with in-memory data
// by temporarily monkey-patching the readEntries function

test("getInsights computes selected_tool_distribution", () => {
  const { readEntries: orig } = require("../services/chatInsightsService");
  // Patch readEntries to return synthetic data
  require("../services/chatInsightsService").__setEntries([
    {
      timestamp: "2025-01-01T00:00:00Z",
      user_id: "u1",
      query_len: 10,
      status: "success",
      fallback_used: false,
      tours_count: 3,
      latency_ms: 200,
      location: "Đà Lạt",
      agent_v2_enabled: true,
      session_id: "s1",
      selected_tool: "search_tours",
      route_source: "deterministic",
      memory_used: false,
      tool_status: "success",
    },
    {
      timestamp: "2025-01-01T00:01:00Z",
      user_id: "u1",
      query_len: 15,
      status: "success",
      fallback_used: false,
      tours_count: 2,
      latency_ms: 300,
      location: "Nha Trang",
      agent_v2_enabled: true,
      session_id: "s1",
      selected_tool: "search_tours",
      route_source: "deterministic",
      memory_used: true,
      tool_status: "success",
    },
    {
      timestamp: "2025-01-01T00:02:00Z",
      user_id: "u2",
      query_len: 20,
      status: "fallback",
      fallback_used: true,
      tours_count: 0,
      latency_ms: 50,
      location: null,
      agent_v2_enabled: true,
      session_id: "s2",
      selected_tool: "fallback_response",
      route_source: "deterministic",
      memory_used: false,
      tool_status: "success",
    },
  ]);

  const result = getInsights({ logPath: "/fake/path.jsonl" });

  assert.equal(result.agent_v2_requests, 3);
  assert.equal(result.selected_tool_distribution["search_tours"], 2);
  assert.equal(result.selected_tool_distribution["fallback_response"], 1);
  assert.equal(result.route_source_distribution["deterministic"], 3);
  assert.equal(result.tool_status_distribution["success"], 3);
  assert.equal(result.memory_used_count, 1);
  assert.equal(result.memory_used_rate, Math.round((1 / 3) * 1000) / 1000);
  assert.equal(result.total_sessions, 2); // s1 and s2
});

test("getInsights computes p95_latency_ms", () => {
  require("../services/chatInsightsService").__setEntries([
    { timestamp: "T1", user_id: "u1", query_len: 10, status: "success", fallback_used: false, tours_count: 1, latency_ms: 100 },
    { timestamp: "T2", user_id: "u1", query_len: 10, status: "success", fallback_used: false, tours_count: 1, latency_ms: 200 },
    { timestamp: "T3", user_id: "u1", query_len: 10, status: "success", fallback_used: false, tours_count: 1, latency_ms: 300 },
    { timestamp: "T4", user_id: "u1", query_len: 10, status: "success", fallback_used: false, tours_count: 1, latency_ms: 400 },
    { timestamp: "T5", user_id: "u1", query_len: 10, status: "success", fallback_used: false, tours_count: 1, latency_ms: 500 },
  ]);

  const result = getInsights({ logPath: "/fake/path.jsonl" });
  assert.equal(result.avg_latency_ms, 300); // (100+200+300+400+500)/5 = 300
  assert.equal(result.p95_latency_ms, 500); // p95 of 5 values
});

test("getInsights computes tool_error_distribution", () => {
  require("../services/chatInsightsService").__setEntries([
    { timestamp: "T1", user_id: "u1", query_len: 10, status: "error", fallback_used: true, tours_count: 0, latency_ms: 100, agent_v2_enabled: true, selected_tool: "search_tours", tool_status: "error", tool_error_type: "missing_config" },
    { timestamp: "T2", user_id: "u1", query_len: 10, status: "error", fallback_used: true, tours_count: 0, latency_ms: 100, agent_v2_enabled: true, selected_tool: "search_tours", tool_status: "error", tool_error_type: "missing_config" },
    { timestamp: "T3", user_id: "u1", query_len: 10, status: "error", fallback_used: true, tours_count: 0, latency_ms: 100, agent_v2_enabled: true, selected_tool: "search_tours", tool_status: "error", tool_error_type: "timeout" },
  ]);

  const result = getInsights({ logPath: "/fake/path.jsonl" });
  assert.equal(result.tool_error_distribution["missing_config"], 2);
  assert.equal(result.tool_error_distribution["timeout"], 1);
  assert.equal(result.tool_status_distribution["error"], 3);
});

test("getInsights handles mixed legacy and agent_v2 entries", () => {
  require("../services/chatInsightsService").__setEntries([
    // Legacy entry
    { timestamp: "T1", user_id: "u1", query_len: 10, status: "success", fallback_used: false, tours_count: 2, latency_ms: 300, location: "Hà Nội" },
    // Agent V2 entry
    { timestamp: "T2", user_id: "u1", query_len: 15, status: "success", fallback_used: false, tours_count: 3, latency_ms: 400, agent_v2_enabled: true, session_id: "s1", selected_tool: "search_tours", route_source: "deterministic", memory_used: false, tool_status: "success" },
    // Legacy entry
    { timestamp: "T3", user_id: "u2", query_len: 8, status: "no_results", fallback_used: false, tours_count: 0, latency_ms: 250, location: "Phú Quốc" },
  ]);

  const result = getInsights({ logPath: "/fake/path.jsonl" });

  assert.equal(result.total_chats, 3);
  assert.equal(result.agent_v2_requests, 1);
  assert.equal(result.agent_v2_rate, Math.round((1 / 3) * 1000) / 1000);
  assert.equal(result.total_sessions, 1);
  assert.equal(result.selected_tool_distribution["search_tours"], 1);
  assert.equal(result.memory_used_count, 0);
  // Legacy entries should not contribute to agent_v2 metrics
  assert.equal(result.selected_tool_distribution["legacy_search"], undefined);
});

test("getInsights recent_events includes agent fields when present", () => {
  require("../services/chatInsightsService").__setEntries([
    { timestamp: "2025-01-01T00:00:00Z", user_id: "u1", query_len: 10, status: "success", fallback_used: false, tours_count: 2, latency_ms: 200, agent_v2_enabled: true, session_id: "s1", selected_tool: "search_tours", route_source: "deterministic", memory_used: true, tool_status: "success" },
  ]);

  const result = getInsights({ logPath: "/fake/path.jsonl" });
  const event = result.recent_events[0];
  assert.equal(event.session_id, "s1");
  assert.equal(event.selected_tool, "search_tours");
  assert.equal(event.route_source, "deterministic");
  assert.equal(event.memory_used, true);
  assert.equal(event.tool_status, "success");
});

test("getInsights recent_events omits agent fields for legacy entries", () => {
  require("../services/chatInsightsService").__setEntries([
    { timestamp: "2025-01-01T00:00:00Z", user_id: "u1", query_len: 10, status: "success", fallback_used: false, tours_count: 2, latency_ms: 200 },
  ]);

  const result = getInsights({ logPath: "/fake/path.jsonl" });
  const event = result.recent_events[0];
  assert.equal(event.session_id, undefined);
  assert.equal(event.selected_tool, undefined);
});

test("getInsights computes fallback_reason_distribution", () => {
  require("../services/chatInsightsService").__setEntries([
    { timestamp: "T1", user_id: "u1", query_len: 10, status: "fallback", fallback_used: true, tours_count: 0, latency_ms: 50, fallback_reason: "greeting" },
    { timestamp: "T2", user_id: "u1", query_len: 10, status: "fallback", fallback_used: true, tours_count: 0, latency_ms: 50, fallback_reason: "greeting" },
    { timestamp: "T3", user_id: "u1", query_len: 10, status: "fallback", fallback_used: true, tours_count: 0, latency_ms: 50, fallback_reason: "out_of_domain" },
  ]);

  const result = getInsights({ logPath: "/fake/path.jsonl" });
  assert.equal(result.fallback_reason_distribution["greeting"], 2);
  assert.equal(result.fallback_reason_distribution["out_of_domain"], 1);
});

// ---------------------------------------------------------------------------
// agentV2ResponseMapper — session and memory fields
// ---------------------------------------------------------------------------

const { mapAgentV2ToFrontend } = require("../services/agentV2ResponseMapper");

test("mapAgentV2ToFrontend forwards route_source in search_metadata", () => {
  const agentResponse = {
    status: "success",
    message: "Tìm thấy tour",
    selected_tool: "search_tours",
    entities: { location: "Đà Lạt" },
    tool_trace: [
      { step: 1, selected_tool: "search_tours", tool_status: "success", latency_ms: 150, result_summary: "3 tours" },
    ],
    data: { total: 3, tours: [], search_metadata: {} },
    route_source: "deterministic",
    session_id: "sess-123",
    memory_used: true,
  };

  const result = mapAgentV2ToFrontend(agentResponse);

  assert.equal(result.search_metadata.selected_tool, "search_tours");
  assert.equal(result.search_metadata.route_source, "deterministic");
  assert.equal(result.session_id, "sess-123");
  assert.equal(result.memory_used, true);
  assert.equal(result.tool_trace[0].selected_tool, "search_tours");
  assert.equal(result.tool_trace[0].tool_status, "success");
});

test("mapAgentV2ToFrontend handles missing session and memory fields", () => {
  const agentResponse = {
    status: "fallback",
    message: "Xin chào",
    selected_tool: "fallback_response",
    entities: {},
    tool_trace: [],
    data: { message: "Xin chào" },
    route_source: "deterministic",
  };

  const result = mapAgentV2ToFrontend(agentResponse);

  assert.equal(result.session_id, undefined);
  assert.equal(result.memory_used, undefined);
  assert.equal(result.search_metadata.route_source, "deterministic");
});

test("mapAgentV2ToFrontend defaults memory_used to undefined when absent", () => {
  const agentResponse = {
    status: "success",
    message: "ok",
    selected_tool: "search_tours",
    entities: {},
    data: {},
  };

  const result = mapAgentV2ToFrontend(agentResponse);

  assert.equal(result.memory_used, undefined);
});

// ---------------------------------------------------------------------------
// chatAnalyticsLogger — summariseToolTrace
// ---------------------------------------------------------------------------

const { summariseToolTrace } = require("../services/chatAnalyticsLogger");

test("summariseToolTrace returns first step summary", () => {
  const trace = [
    { step: 1, selected_tool: "search_tours", tool_status: "success", latency_ms: 150, error_type: null, result_summary: "3 tours" },
    { step: 2, selected_tool: "get_tour_detail", tool_status: "skipped", latency_ms: 0, error_type: null, result_summary: null },
  ];

  const result = summariseToolTrace(trace);
  assert.deepEqual(result, {
    selected_tool: "search_tours",
    tool_status: "success",
    error_type: null,
  });
});

test("summariseToolTrace returns null for empty trace", () => {
  assert.equal(summariseToolTrace([]), null);
  assert.equal(summariseToolTrace(null), null);
  assert.equal(summariseToolTrace(undefined), null);
});

test("summariseToolTrace handles first step with missing fields", () => {
  const result = summariseToolTrace([{ step: 1 }]);
  assert.equal(result.selected_tool, null);
  assert.equal(result.tool_status, null);
  assert.equal(result.error_type, null);
});
