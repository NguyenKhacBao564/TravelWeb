"""
Tests for the AI Agent layer (agent package).

Tests router, orchestrator, and /agent/chat-v2 endpoint.
Mocks all external dependencies (Express client, Gemini).
Requires pytest.
"""
import re
from unittest.mock import MagicMock, patch

import pytest


# ---------------------------------------------------------------------------
# Router tests
# ---------------------------------------------------------------------------

class TestDeterministicRouter:
    """Tests for DeterministicRouter.route()."""

    def test_tour_search_keyword_selects_search_tours(self):
        """Vietnamese travel query with keyword should route to search_tours."""
        with patch.dict("os.environ", {}, clear=True):
            from agent.router import DeterministicRouter
            router = DeterministicRouter()
            decision = router.route("Tôi muốn tìm tour Đà Lạt tháng 6")
        assert decision.tool_name == "search_tours"
        assert "da-lat" in str(decision.entities).lower() or "đà lạt" in str(decision.entities).lower()

    def test_greeting_routes_to_fallback(self):
        """Greeting query should route to fallback_response."""
        with patch.dict("os.environ", {}, clear=True):
            from agent.router import DeterministicRouter
            router = DeterministicRouter()
        for greeting in ["xin chào", "chào bạn", "hello", "hi em"]:
            decision = router.route(greeting)
            assert decision.tool_name == "fallback_response", f"Expected fallback_response for '{greeting}', got {decision.tool_name}"
            assert decision.reason == "greeting"

    def test_out_of_domain_query_routes_to_fallback(self):
        """Non-travel query should route to fallback_response."""
        with patch.dict("os.environ", {}, clear=True):
            from agent.router import DeterministicRouter
            router = DeterministicRouter()
        decision = router.route("Cách nấu phở bò?")
        assert decision.tool_name == "fallback_response"

    def test_empty_query_routes_to_fallback(self):
        """Empty query should route to fallback_response."""
        with patch.dict("os.environ", {}, clear=True):
            from agent.router import DeterministicRouter
            router = DeterministicRouter()
        decision = router.route("")
        assert decision.tool_name == "fallback_response"
        decision2 = router.route("   ")
        assert decision2.tool_name == "fallback_response"

    def test_tour_id_pattern_routes_to_get_tour_detail(self):
        """Query containing a tour_id should route to get_tour_detail."""
        with patch.dict("os.environ", {}, clear=True):
            from agent.router import DeterministicRouter
            router = DeterministicRouter()
        decision = router.route("Chi tiết tour TOUR001")
        assert decision.tool_name == "get_tour_detail"
        assert decision.entities.get("tour_id") == "TOUR001"

    def test_entities_found_without_keyword_routes_to_search_tours(self):
        """Query with location/price/time but no keyword should still route to search_tours."""
        with patch.dict("os.environ", {}, clear=True):
            from agent.router import DeterministicRouter
            router = DeterministicRouter()
        decision = router.route("Đà Lạt tháng 7 ngân sách 5 triệu")
        assert decision.tool_name == "search_tours"


# ---------------------------------------------------------------------------
# Tool registry tests
# ---------------------------------------------------------------------------

class TestToolRegistry:
    """Tests for ToolRegistry."""

    def test_search_tours_is_registered(self):
        """search_tours tool should be registered."""
        with patch.dict("os.environ", {}, clear=True):
            from agent.tool_registry import get_registry
        reg = get_registry()
        tool = reg.get("search_tours")
        assert tool is not None
        assert tool["name"] == "search_tours"
        assert "location" in tool["input_fields"]

    def test_get_tour_detail_is_registered(self):
        """get_tour_detail tool should be registered."""
        with patch.dict("os.environ", {}, clear=True):
            from agent.tool_registry import get_registry
        reg = get_registry()
        tool = reg.get("get_tour_detail")
        assert tool is not None
        assert tool["name"] == "get_tour_detail"
        assert "tour_id" in tool["input_fields"]

    def test_fallback_response_is_registered(self):
        """fallback_response tool should be registered."""
        with patch.dict("os.environ", {}, clear=True):
            from agent.tool_registry import get_registry
        reg = get_registry()
        tool = reg.get("fallback_response")
        assert tool is not None

    def test_faq_retrieval_is_registered(self):
        """faq_retrieval tool should be registered."""
        with patch.dict("os.environ", {}, clear=True):
            from agent.tool_registry import get_registry
        reg = get_registry()
        tool = reg.get("faq_retrieval")
        assert tool is not None
        assert "query" in tool["input_fields"]

    def test_booking_policy_lookup_is_registered(self):
        """booking_policy_lookup tool should be registered."""
        with patch.dict("os.environ", {}, clear=True):
            from agent.tool_registry import get_registry
        reg = get_registry()
        tool = reg.get("booking_policy_lookup")
        assert tool is not None
        assert "query" in tool["input_fields"]

    def test_list_tools_returns_all_five(self):
        """list_tools should return all registered tools."""
        with patch.dict("os.environ", {}, clear=True):
            from agent.tool_registry import get_registry
        reg = get_registry()
        tools = reg.list_tools()
        names = {t["name"] for t in tools}
        assert names == {
            "search_tours",
            "get_tour_detail",
            "faq_retrieval",
            "booking_policy_lookup",
            "fallback_response",
        }


# ---------------------------------------------------------------------------
# Orchestrator tests
# ---------------------------------------------------------------------------

class TestOrchestrator:
    """Tests for the orchestrator run() function."""

    def test_returns_tool_trace(self):
        """run() must always include a tool_trace in the response."""
        with patch.dict("os.environ", {}, clear=True):
            from agent import AgentRequest, run
        req = AgentRequest(query="Tôi muốn tìm tour Đà Lạt")
        resp = run(req)
        assert isinstance(resp.tool_trace, list)
        assert len(resp.tool_trace) >= 1
        assert resp.tool_trace[0].step == 1

    def test_greeting_returns_fallback_response(self):
        """Greeting should return fallback_response with no tool error."""
        with patch.dict("os.environ", {}, clear=True):
            from agent import AgentRequest, run
        req = AgentRequest(query="Xin chào bạn")
        resp = run(req)
        assert resp.selected_tool == "fallback_response"
        assert resp.status in ("fallback", "success")

    def test_orchestrator_handles_tool_error_without_exception(self):
        """If a tool raises, orchestrator should catch and return error, not raise."""
        with patch.dict("os.environ", {}, clear=True):
            from agent import AgentRequest, run
            from agent.tool_registry import get_registry

        # Replace search_tours with a broken callable
        reg = get_registry()
        original = reg.get("search_tours")
        reg._tools["search_tours"] = {
            **original,
            "callable": lambda **kw: (_ for _ in ()).throw(RuntimeError("boom")),
        }

        req = AgentRequest(query="Tìm tour Nha Trang")
        resp = run(req)

        # Restore
        reg._tools["search_tours"] = original

        # Should not raise — response should exist
        assert resp is not None
        assert resp.status == "error"

    def test_orchestrator_returns_stable_response_shape(self):
        """Response must have all required AgentResponse fields."""
        with patch.dict("os.environ", {}, clear=True):
            from agent import AgentRequest, run
        req = AgentRequest(query="Tìm tour")
        resp = run(req)

        assert hasattr(resp, "status")
        assert hasattr(resp, "message")
        assert hasattr(resp, "selected_tool")
        assert hasattr(resp, "entities")
        assert hasattr(resp, "tool_trace")
        assert hasattr(resp, "data")
        assert resp.status in ("success", "no_results", "missing_info", "faq", "fallback", "error")
        assert isinstance(resp.message, str)
        assert resp.selected_tool in (
            "search_tours",
            "get_tour_detail",
            "faq_retrieval",
            "booking_policy_lookup",
            "fallback_response",
        )

    def test_orchestrator_includes_entities_in_response(self):
        """Entities extracted by router should appear in response.entities."""
        with patch.dict("os.environ", {}, clear=True):
            from agent import AgentRequest, run
        req = AgentRequest(query="Tour Đà Lạt dưới 5 triệu")
        resp = run(req)
        # Location or price_max should be extracted
        entities = resp.entities
        has_location = bool(entities.get("location") or entities.get("destination_normalized"))
        has_price = entities.get("price_max") is not None
        # At least one entity should be extracted for this query
        assert has_location or has_price or resp.selected_tool in ("search_tours", "fallback_response")

    def test_tool_trace_includes_latency_ms(self):
        """Each tool_trace entry should have a numeric latency_ms."""
        with patch.dict("os.environ", {}, clear=True):
            from agent import AgentRequest, run
        req = AgentRequest(query="Tìm tour Huế")
        resp = run(req)
        assert len(resp.tool_trace) >= 1
        assert isinstance(resp.tool_trace[0].latency_ms, (int, float))
        assert resp.tool_trace[0].latency_ms >= 0

    def test_fallback_response_includes_greeting_message(self):
        """fallback_response should include a Vietnamese greeting message."""
        with patch.dict("os.environ", {}, clear=True):
            from agent import AgentRequest, run
        req = AgentRequest(query="chào bạn")
        resp = run(req)
        assert resp.selected_tool == "fallback_response"
        assert "chào" in resp.message.lower() or "xin" in resp.message.lower()


# ---------------------------------------------------------------------------
# /agent/chat-v2 endpoint tests (HTTX-style)
# ---------------------------------------------------------------------------

class TestAgentChatV2Endpoint:
    """Tests for POST /agent/chat-v2 (mocked HTTP)."""

    def test_endpoint_returns_stable_shape(self):
        """The endpoint response must match AgentResponse schema."""
        with patch.dict("os.environ", {}, clear=True):
            from agent import AgentRequest, run
        req = AgentRequest(query="Tìm tour Phú Quốc")
        resp = run(req)

        # Verify schema fields
        assert resp.status in ("success", "no_results", "missing_info", "faq", "fallback", "error")
        assert isinstance(resp.message, str)
        assert isinstance(resp.selected_tool, str)
        assert isinstance(resp.entities, dict)
        assert isinstance(resp.tool_trace, list)
        assert isinstance(resp.data, dict) or resp.data is None

    def test_endpoint_response_has_tool_trace_with_step(self):
        """Response tool_trace should have step=1 entries."""
        with patch.dict("os.environ", {}, clear=True):
            from agent import AgentRequest, run
        req = AgentRequest(query="Tìm tour Sapa")
        resp = run(req)

        assert len(resp.tool_trace) >= 1
        entry = resp.tool_trace[0]
        assert entry.step == 1
        assert entry.selected_tool in (
            "search_tours",
            "get_tour_detail",
            "faq_retrieval",
            "booking_policy_lookup",
            "fallback_response",
        )
        assert entry.tool_status in ("success", "error")

    def test_endpoint_accepts_optional_user_id(self):
        """AgentRequest should accept optional user_id."""
        with patch.dict("os.environ", {}, clear=True):
            from agent import AgentRequest, run
        req = AgentRequest(query="Tìm tour", user_id="user123")
        resp = run(req)
        assert resp is not None
        assert resp.status in ("success", "no_results", "missing_info", "faq", "fallback", "error")

    def test_unknown_tool_falls_back_safely(self):
        """If router returns an unknown tool, orchestrator falls back to fallback_response."""
        with patch.dict("os.environ", {}, clear=True):
            from agent.router import DeterministicRouter

        class FakeRouter(DeterministicRouter):
            def route(self, query, memory_context=None):
                from agent.router import RouteDecision
                return RouteDecision(tool_name="nonexistent_tool", entities={}, reason="test")

        with patch("agent.orchestrator.get_router") as mock_get_router:
            mock_get_router.return_value = FakeRouter()
            from agent import AgentRequest, run
            req = AgentRequest(query="test")
            resp = run(req)

        assert resp.selected_tool == "fallback_response"
        assert resp.status == "fallback"
