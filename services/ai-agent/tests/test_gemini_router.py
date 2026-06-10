"""
Tests for Phase 2C: Gemini structured tool routing.

Tests the Gemini router, hybrid router, and orchestrator route_source integration.
All Gemini API calls are mocked — no real API calls in tests.
"""
from unittest.mock import MagicMock, patch

import pytest


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

VALID_SEARCH_RESULT = {
    "selected_tool": "search_tours",
    "intent": "find_tour",
    "entities": {
        "location": "Đà Lạt",
        "destination_normalized": "da-lat",
        "date_start": "2025-07-01",
        "date_end": None,
        "price_min": None,
        "price_max": 5000000,
        "people_count": 2,
        "tour_id": None,
    },
    "missing_fields": [],
    "confidence": 0.95,
}

VALID_DETAIL_RESULT = {
    "selected_tool": "get_tour_detail",
    "intent": "tour_detail",
    "entities": {"tour_id": "TOUR001"},
    "missing_fields": [],
    "confidence": 0.98,
}


def _mock_gemini(json_resp: dict):
    """Return a mock _call_gemini that returns JSON string."""
    import json as _json
    return MagicMock(return_value=_json.dumps(json_resp))


def _mock_gemini_error(exc: Exception):
    """Return a mock _call_gemini that raises."""
    return MagicMock(side_effect=exc)


# ---------------------------------------------------------------------------
# gemini_router unit tests
# ---------------------------------------------------------------------------

class TestGeminiRouterParseAndValidate:
    """Direct tests of _parse_and_validate (no Gemini call needed)."""

    def _parse(self, raw: str = ""):
        from agent.gemini_router import _parse_and_validate
        return _parse_and_validate(raw)

    def test_parses_valid_json(self):
        import json
        result = self._parse(json.dumps(VALID_SEARCH_RESULT))
        assert result is not None
        assert result["selected_tool"] == "search_tours"
        assert result["confidence"] == 0.95

    def test_strips_json_code_fence(self):
        """_parse_and_validate handles ```json ... ``` markdown fences."""
        result = self._parse('```json\n{"selected_tool":"search_tours","intent":"find_tour","confidence":0.9}\n```')
        assert result is not None
        assert result["selected_tool"] == "search_tours"

    def test_rejects_invalid_json(self):
        assert self._parse("not json at all") is None
        assert self._parse("{ broken") is None

    def test_rejects_unknown_tool(self):
        import json
        result = self._parse(json.dumps({"selected_tool": "nonexistent", "confidence": 0.9}))
        assert result is None

    def test_rejects_confidence_out_of_range(self):
        import json
        assert self._parse(json.dumps({"selected_tool": "search_tours", "confidence": 1.5})) is None
        assert self._parse(json.dumps({"selected_tool": "search_tours", "confidence": -0.1})) is None

    def test_rejects_confidence_not_numeric(self):
        import json
        assert self._parse(json.dumps({"selected_tool": "search_tours", "confidence": "high"})) is None

    def test_rejects_unknown_intent(self):
        import json
        result = self._parse(json.dumps({"selected_tool": "search_tours", "confidence": 0.9, "intent": "invalid_intent"}))
        assert result is None

    def test_accepted_intents(self):
        import json
        for intent in ("find_tour", "tour_detail", "greeting", "out_of_domain", "unknown"):
            result = self._parse(json.dumps({"selected_tool": "search_tours", "confidence": 0.9, "intent": intent}))
            assert result is not None, f"intent {intent} should be accepted"


class TestGeminiRouterIntegration:
    """Tests for gemini_route() with mocked _call_gemini."""

    def test_returns_search_tours_for_valid_gemini_response(self):
        from agent.gemini_router import gemini_route

        with patch("agent.gemini_router._call_gemini", _mock_gemini(VALID_SEARCH_RESULT)):
            decision = gemini_route("Tìm tour Đà Lạt tháng 7 dưới 5 triệu")

        assert decision.tool_name == "search_tours"
        assert decision.route_source == "gemini"
        assert decision.entities.get("location") == "Đà Lạt"
        assert decision.entities.get("price_max") == 5000000

    def test_returns_get_tour_detail_for_tour_id_intent(self):
        from agent.gemini_router import gemini_route

        with patch("agent.gemini_router._call_gemini", _mock_gemini(VALID_DETAIL_RESULT)):
            decision = gemini_route("Chi tiết tour TOUR001")

        assert decision.tool_name == "get_tour_detail"
        assert decision.route_source == "gemini"
        assert decision.entities.get("tour_id") == "TOUR001"

    def test_falls_back_to_deterministic_on_invalid_json(self):
        from agent.gemini_router import gemini_route

        with patch("agent.gemini_router._call_gemini", MagicMock(return_value="not json")):
            decision = gemini_route("Tìm tour Nha Trang")

        assert decision.route_source == "deterministic_fallback"
        # Deterministic still works
        assert decision.tool_name in ("search_tours", "fallback_response")

    def test_falls_back_to_deterministic_on_unknown_tool(self):
        import json
        from agent.gemini_router import gemini_route

        with patch("agent.gemini_router._call_gemini", MagicMock(return_value=json.dumps({
            "selected_tool": "made_up_tool",
            "confidence": 0.9,
        }))):
            decision = gemini_route("Tìm tour Huế")

        assert decision.route_source == "deterministic_fallback"

    def test_falls_back_to_deterministic_on_gemini_timeout(self):
        from agent.gemini_router import gemini_route

        with patch("agent.gemini_router._call_gemini", _mock_gemini_error(TimeoutError("timed out"))):
            decision = gemini_route("Tìm tour Sapa")

        assert decision.route_source == "deterministic_fallback"
        assert decision.tool_name in ("search_tours", "fallback_response")

    def test_falls_back_to_deterministic_on_gemini_api_error(self):
        from agent.gemini_router import gemini_route

        with patch("agent.gemini_router._call_gemini", _mock_gemini_error(RuntimeError("API error"))):
            decision = gemini_route("Tour Đà Lạt")

        assert decision.route_source == "deterministic_fallback"

    def test_route_source_is_gemini_on_success(self):
        from agent.gemini_router import gemini_route

        with patch("agent.gemini_router._call_gemini", _mock_gemini(VALID_SEARCH_RESULT)):
            decision = gemini_route("Tìm tour")

        assert decision.route_source == "gemini"
        # Chain-of-thought fields should not exist
        assert not hasattr(decision, "reasoning")
        assert not hasattr(decision, "chain_of_thought")

    def test_out_of_domain_intent_maps_to_fallback(self):
        import json
        from agent.gemini_router import gemini_route

        with patch("agent.gemini_router._call_gemini", MagicMock(return_value=json.dumps({
            "selected_tool": "search_tours",
            "intent": "out_of_domain",
            "confidence": 0.8,
        }))):
            decision = gemini_route("Cách nấu phở bò")

        assert decision.tool_name == "fallback_response"
        assert decision.route_source == "gemini"

    def test_greeting_intent_maps_to_fallback(self):
        import json
        from agent.gemini_router import gemini_route

        with patch("agent.gemini_router._call_gemini", MagicMock(return_value=json.dumps({
            "selected_tool": "search_tours",
            "intent": "greeting",
            "confidence": 0.95,
        }))):
            decision = gemini_route("Xin chào bạn")

        assert decision.tool_name == "fallback_response"

    def test_unknown_intent_maps_to_fallback(self):
        import json
        from agent.gemini_router import gemini_route

        with patch("agent.gemini_router._call_gemini", MagicMock(return_value=json.dumps({
            "selected_tool": "search_tours",
            "intent": "unknown",
            "confidence": 0.4,
        }))):
            decision = gemini_route("something random")

        assert decision.tool_name == "fallback_response"


# ---------------------------------------------------------------------------
# Hybrid router tests
# ---------------------------------------------------------------------------

class TestHybridRouter:
    """Tests for HybridRouter."""

    def test_uses_deterministic_for_greeting(self):
        from agent.hybrid_router import HybridRouter

        with patch("agent.hybrid_router.gemini_route") as mock_gemini:
            router = HybridRouter()
            decision = router.route("Xin chào bạn")

        mock_gemini.assert_not_called()
        assert decision.tool_name == "fallback_response"

    def test_uses_deterministic_for_out_of_domain(self):
        from agent.hybrid_router import HybridRouter

        with patch("agent.hybrid_router.gemini_route") as mock_gemini:
            router = HybridRouter()
            decision = router.route("Cách nấu phở")

        mock_gemini.assert_not_called()
        assert decision.tool_name == "fallback_response"

    def test_uses_deterministic_for_tour_id(self):
        from agent.hybrid_router import HybridRouter

        with patch("agent.hybrid_router.gemini_route") as mock_gemini:
            router = HybridRouter()
            decision = router.route("Chi tiết tour TOUR001")

        mock_gemini.assert_not_called()
        assert decision.tool_name == "get_tour_detail"

    def test_delegates_to_gemini_for_ambiguous_query(self):
        """Hybrid router calls gemini_route when deterministic has no clear match."""
        from agent.hybrid_router import HybridRouter

        with patch("agent.hybrid_router.gemini_route") as mock_gemini:
            mock_gemini.return_value = MagicMock(
                tool_name="search_tours",
                entities={"location": "Nha Trang"},
                reason="gemini:find_tour",
                route_source="gemini",
            )
            router = HybridRouter()
            # "cho hỏi" has no keyword match and no location entity → gemini called
            decision = router.route("cho hỏi")

        mock_gemini.assert_called_once()
        assert decision.tool_name == "search_tours"
        assert decision.route_source == "gemini"

    def test_uses_deterministic_when_tour_keyword_detected(self):
        """Hybrid router skips gemini when deterministic detects tour_search_keyword."""
        from agent.hybrid_router import HybridRouter

        with patch("agent.hybrid_router.gemini_route") as mock_gemini:
            router = HybridRouter()
            decision = router.route("Tìm tour ở Đà Lạt")

        mock_gemini.assert_not_called()
        assert decision.route_source == "deterministic"
        assert decision.tool_name == "search_tours"

    def test_falls_back_to_deterministic_on_gemini_failure(self):
        """
        If gemini_route raises, HybridRouter falls back to deterministic.
        "cho hỏi tour" has no keyword match and no entities (extract_location
        won't match "hỏi"), so it delegates to gemini which raises.
        """
        from agent.hybrid_router import HybridRouter

        with patch("agent.hybrid_router.gemini_route", side_effect=RuntimeError("boom")):
            router = HybridRouter()
            decision = router.route("cho hỏi tour")

        assert decision.route_source == "deterministic_fallback"
        assert decision.tool_name == "fallback_response"


# ---------------------------------------------------------------------------
# Router mode factory tests
# ---------------------------------------------------------------------------

class TestRouterModeFactory:
    """Tests for _build_router() and get_router_mode()."""

    def test_default_mode_is_deterministic(self):
        with patch.dict("os.environ", {}, clear=True):
            from agent.router import get_router_mode
            assert get_router_mode() == "deterministic"

    def test_explicit_deterministic_mode(self):
        with patch.dict("os.environ", {"AGENT_ROUTER_MODE": "deterministic"}, clear=True):
            from agent.router import get_router_mode
            assert get_router_mode() == "deterministic"

    def test_gemini_mode_returns_proxy(self):
        with patch.dict("os.environ", {"AGENT_ROUTER_MODE": "gemini"}, clear=True):
            from agent.router import get_router_mode
            assert get_router_mode() == "gemini"

    def test_hybrid_mode(self):
        with patch.dict("os.environ", {"AGENT_ROUTER_MODE": "hybrid"}, clear=True):
            from agent.router import get_router_mode
            assert get_router_mode() == "hybrid"


# ---------------------------------------------------------------------------
# Orchestrator route_source integration tests
# ---------------------------------------------------------------------------

class TestOrchestratorRouteSource:
    """Tests that orchestrator forwards route_source to AgentResponse."""

    def test_route_source_field_present_in_response(self):
        """Verify AgentResponse has route_source field after routing."""
        from agent import AgentRequest
        from agent.orchestrator import run

        req = AgentRequest(query="Tìm tour Đà Lạt")
        resp = run(req)

        assert hasattr(resp, "route_source")
        assert resp.route_source in ("deterministic", "deterministic_fallback")

    def test_route_source_gemini_on_valid_gemini_output(self):
        """When gemini returns valid JSON, response.route_source is 'gemini'."""
        from agent import AgentRequest
        from agent.router import RouteDecision
        from agent.orchestrator import run

        gemini_decision = RouteDecision(
            tool_name="search_tours",
            entities={"location": "Đà Lạt", "price_max": 5000000},
            reason="gemini:find_tour",
            route_source="gemini",
        )
        with patch("agent.orchestrator.get_router") as mock_get_router:
            mock_router = MagicMock()
            mock_router.route.return_value = gemini_decision
            mock_get_router.return_value = mock_router

            req = AgentRequest(query="Tìm tour Phú Quốc")
            resp = run(req)

        assert resp.route_source == "gemini"
        assert resp.selected_tool == "search_tours"

    def test_response_contains_no_chain_of_thought(self):
        """Verify AgentResponse never exposes raw Gemini reasoning."""
        from agent import AgentRequest
        from agent.orchestrator import run

        req = AgentRequest(query="Tìm tour")
        resp = run(req)

        resp_dict = resp.model_dump()
        chain_fields = {"reasoning", "chain_of_thought", "thought", "cot", "raw_prompt"}
        for field_name in chain_fields:
            assert field_name not in resp_dict, f"Hidden field '{field_name}' should not be in response"

    def test_route_source_never_exposes_raw_prompt(self):
        """route_source values must not contain prompt text or API keys."""
        from agent import AgentRequest
        from agent.orchestrator import run

        req = AgentRequest(query="Tìm tour Huế")
        resp = run(req)

        resp_dict = resp.model_dump()
        # route_source should be one of the known safe values
        assert resp.route_source in (
            "deterministic", "deterministic_fallback",
            "gemini", "gemini_fallback",
        )
