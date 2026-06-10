"""
Tests for FAQ and booking policy retrieval tools (Phase 4A).
"""
from unittest.mock import MagicMock, patch

import pytest

from schemas.chat_response import FAQSource


def _make_faq_source(question="Q?", answer="A.", tags=None, score=0.9, source="faq_metadata:0"):
    return FAQSource(
        question=question,
        answer=answer,
        tags=tags or [],
        score=score,
        source=source,
    )


class TestFaqRetrievalTool:
    def test_bad_query_returns_error_shape(self):
        from services.tools.faq_retrieval_tool import faq_retrieval_tool

        result = faq_retrieval_tool(query="   ")
        assert result["ok"] is False
        assert result["status"] == "error"
        assert result["tool"] == "faq_retrieval"
        assert result["error_type"] == "bad_query"
        assert result["hits"] == []

    def test_index_missing_returns_error_shape(self):
        with patch("services.tools.faq_retrieval_tool._get_pipeline", return_value=(None, "index_missing")):
            from services.tools.faq_retrieval_tool import faq_retrieval_tool

            result = faq_retrieval_tool(query="TourGuide la gi?")
        assert result["ok"] is False
        assert result["error_type"] == "index_missing"

    def test_success_returns_stable_shape(self):
        mock_pipeline = MagicMock()
        mock_pipeline.retrieve.return_value = [
            _make_faq_source(question="TourGuide la gi?", answer="TourGuide la huong dan vien."),
        ]
        with patch("services.tools.faq_retrieval_tool._get_pipeline", return_value=(mock_pipeline, None)):
            from services.tools.faq_retrieval_tool import faq_retrieval_tool

            result = faq_retrieval_tool(query="TourGuide la gi?")

        assert result["ok"] is True
        assert result["status"] == "success"
        assert result["tool"] == "faq_retrieval"
        assert len(result["hits"]) == 1
        assert result["hits"][0]["title"] == "TourGuide la gi?"
        assert "TourGuide" in result["message"]
        assert isinstance(result["latency_ms"], (int, float))

    def test_no_results_returns_no_results_shape(self):
        mock_pipeline = MagicMock()
        mock_pipeline.retrieve.return_value = []
        with patch("services.tools.faq_retrieval_tool._get_pipeline", return_value=(mock_pipeline, None)):
            from services.tools.faq_retrieval_tool import faq_retrieval_tool

            result = faq_retrieval_tool(query="Cau hoi khong co trong FAQ")

        assert result["ok"] is True
        assert result["status"] == "no_results"
        assert result["hits"] == []


class TestBookingPolicyLookupTool:
    def test_detects_cancellation_category(self):
        from services.tools.booking_policy_lookup_tool import detect_policy_category

        assert detect_policy_category("Huy tour duoc khong?") == "cancellation"

    def test_detects_refund_category(self):
        from services.tools.booking_policy_lookup_tool import detect_policy_category

        assert detect_policy_category("Chinh sach hoan tien the nao?") == "refund"

    def test_detects_payment_category(self):
        from services.tools.booking_policy_lookup_tool import detect_policy_category

        assert detect_policy_category("Thanh toan bang MoMo duoc khong?") == "payment"

    def test_detects_documents_category(self):
        from services.tools.booking_policy_lookup_tool import detect_policy_category

        assert detect_policy_category("Can giay to gi khi di tour?") == "documents"

    def test_detects_support_category(self):
        from services.tools.booking_policy_lookup_tool import detect_policy_category

        assert detect_policy_category("Lam sao lien he ho tro?") == "support"

    def test_success_returns_policy_category(self):
        mock_pipeline = MagicMock()
        mock_pipeline.retrieve.return_value = [
            _make_faq_source(
                question="Huy tour?",
                answer="Co the huy truoc 7 ngay.",
                tags=["huy-tour", "chinh-sach"],
            ),
        ]
        with patch("services.tools.faq_retrieval_tool._get_pipeline", return_value=(mock_pipeline, None)):
            from services.tools.booking_policy_lookup_tool import booking_policy_lookup_tool

            result = booking_policy_lookup_tool(query="Huy tour duoc khong?")

        assert result["ok"] is True
        assert result["status"] == "success"
        assert result["tool"] == "booking_policy_lookup"
        assert result["policy_category"] == "cancellation"
        assert len(result["hits"]) >= 1


class TestRouterFaqPolicy:
    def test_policy_question_routes_to_booking_policy_lookup(self):
        with patch.dict("os.environ", {}, clear=True):
            from agent.router import DeterministicRouter

            router = DeterministicRouter()
            decision = router.route("Hủy tour được không?")
        assert decision.tool_name == "booking_policy_lookup"
        assert decision.reason == "booking_policy_keyword"

    def test_payment_question_routes_to_booking_policy_lookup(self):
        with patch.dict("os.environ", {}, clear=True):
            from agent.router import DeterministicRouter

            router = DeterministicRouter()
            decision = router.route("Thanh toán bằng MoMo được không?")
        assert decision.tool_name == "booking_policy_lookup"

    def test_faq_question_routes_to_faq_retrieval(self):
        with patch.dict("os.environ", {}, clear=True):
            from agent.router import DeterministicRouter

            router = DeterministicRouter()
            decision = router.route("TourGuide là gì?")
        assert decision.tool_name == "faq_retrieval"
        assert decision.reason == "faq_keyword"

    def test_tour_search_still_routes_to_search_tours(self):
        with patch.dict("os.environ", {}, clear=True):
            from agent.router import DeterministicRouter

            router = DeterministicRouter()
            decision = router.route("Tìm tour Đà Lạt tháng 6")
        assert decision.tool_name == "search_tours"


class TestOrchestratorFaqPolicy:
    def test_orchestrator_returns_tool_trace_for_faq_retrieval(self):
        mock_result = {
            "ok": True,
            "status": "success",
            "tool": "faq_retrieval",
            "message": "TourGuide la huong dan vien du lich.",
            "hits": [{"doc_id": "0", "title": "Q", "snippet": "A", "score": 0.9, "source": "faq"}],
            "error_type": None,
            "latency_ms": 12.0,
        }
        with patch.dict("os.environ", {}, clear=True):
            from agent import AgentRequest, run
            from agent.tool_registry import get_registry

            reg = get_registry()
            original = reg.get("faq_retrieval")
            reg._tools["faq_retrieval"] = {**original, "callable": lambda **kw: mock_result}

            req = AgentRequest(query="TourGuide là gì?")
            resp = run(req)

            reg._tools["faq_retrieval"] = original

        assert resp.selected_tool == "faq_retrieval"
        assert resp.status == "faq"
        assert len(resp.tool_trace) >= 1
        assert resp.tool_trace[0].selected_tool == "faq_retrieval"
        assert resp.data is not None
        assert len(resp.data.get("hits", [])) == 1

    def test_chat_v2_policy_query_stable_shape(self):
        mock_result = {
            "ok": True,
            "status": "success",
            "tool": "booking_policy_lookup",
            "policy_category": "cancellation",
            "message": "Co the huy tour truoc 7 ngay.",
            "hits": [{"doc_id": "0", "title": "Huy tour?", "snippet": "Co the huy.", "score": 0.8, "source": "faq"}],
            "error_type": None,
            "latency_ms": 15.0,
        }
        with patch.dict("os.environ", {}, clear=True):
            from agent import AgentRequest, run
            from agent.tool_registry import get_registry

            reg = get_registry()
            original = reg.get("booking_policy_lookup")
            reg._tools["booking_policy_lookup"] = {**original, "callable": lambda **kw: mock_result}

            req = AgentRequest(query="Hủy tour được không?")
            resp = run(req)

            reg._tools["booking_policy_lookup"] = original

        assert resp.selected_tool == "booking_policy_lookup"
        assert resp.status == "faq"
        assert resp.data.get("policy_category") == "cancellation"


class TestGeminiRouterNewTools:
    VALID_POLICY_RESULT = (
        '{"selected_tool": "booking_policy_lookup", "intent": "policy_question", '
        '"entities": {"location": null}, "missing_fields": [], "confidence": 0.9}'
    )

    def test_accepts_booking_policy_lookup_tool(self):
        from agent.gemini_router import _parse_and_validate

        parsed = _parse_and_validate(self.VALID_POLICY_RESULT)
        assert parsed is not None
        assert parsed["selected_tool"] == "booking_policy_lookup"
        assert parsed["intent"] == "policy_question"

    def test_accepts_faq_retrieval_tool(self):
        from agent.gemini_router import _parse_and_validate

        raw = (
            '{"selected_tool": "faq_retrieval", "intent": "faq_question", '
            '"entities": {}, "missing_fields": [], "confidence": 0.85}'
        )
        parsed = _parse_and_validate(raw)
        assert parsed is not None
        assert parsed["selected_tool"] == "faq_retrieval"

    def test_rejects_unknown_tool(self):
        from agent.gemini_router import _parse_and_validate

        raw = (
            '{"selected_tool": "unknown_tool", "intent": "unknown", '
            '"entities": {}, "missing_fields": [], "confidence": 0.5}'
        )
        assert _parse_and_validate(raw) is None

    def test_unknown_gemini_tool_falls_back_safely(self):
        with patch("agent.gemini_router._call_gemini", return_value='{"selected_tool": "bad_tool", "intent": "unknown", "entities": {}, "missing_fields": [], "confidence": 0.5}'):
            with patch.dict("os.environ", {}, clear=True):
                from agent.gemini_router import gemini_route

                decision = gemini_route("cho hoi")
        assert decision.tool_name == "fallback_response"
        assert decision.route_source == "deterministic_fallback"
