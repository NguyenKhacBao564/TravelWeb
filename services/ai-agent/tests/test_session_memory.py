"""
Tests for Phase 3A: Session Memory.

Covers SessionStore, SessionMemory, orchestrator memory integration,
and follow-up routing. All external calls are mocked.
"""
import pytest
from unittest.mock import MagicMock, patch

pytestmark = pytest.mark.usefixtures("clean_session_store")

import pytest


# ---------------------------------------------------------------------------
# SessionStore unit tests
# ---------------------------------------------------------------------------

class TestSessionStore:
    """Unit tests for SessionStore operations."""
    __name__ = "TestSessionStore"

    def test_create_returns_new_session(self, clean_session_store):
        from agent.memory import SessionStore

        store = SessionStore()
        mem = store.create("sid-abc", user_id="user1")

        assert mem.session_id == "sid-abc"
        assert mem.user_id == "user1"
        assert mem.destination is None
        assert mem.recent_turns == []

    def test_get_returns_existing_session(self):
        from agent.memory import SessionStore

        store = SessionStore()
        created = store.create("sid-xyz")
        mem = store.get("sid-xyz")

        assert mem is created

    def test_get_returns_none_for_nonexistent(self):
        from agent.memory import SessionStore

        store = SessionStore()
        assert store.get("nonexistent") is None

    def test_get_returns_none_for_empty_string(self):
        from agent.memory import SessionStore

        store = SessionStore()
        assert store.get("") is None
        assert store.get(None) is None

    def test_reset_deletes_session(self):
        from agent.memory import SessionStore

        store = SessionStore()
        store.create("sid-del")
        assert store.get("sid-del") is not None

        result = store.reset("sid-del")
        assert result is True
        assert store.get("sid-del") is None

    def test_reset_returns_false_for_nonexistent(self):
        from agent.memory import SessionStore

        store = SessionStore()
        assert store.reset("nonexistent") is False

    def test_merge_entities_updates_only_null_fields(self):
        from agent.memory import SessionStore

        store = SessionStore()
        store.create("sid-merge")

        store.merge_entities(
            "sid-merge",
            entities={"location": "Đà Lạt"},
        )
        mem = store.get("sid-merge")
        assert mem.destination == "Đà Lạt"

        # Second merge with different entity fills that slot too
        store.merge_entities(
            "sid-merge",
            entities={"price_max": 5000000, "people_count": 2},
        )
        mem = store.get("sid-merge")
        assert mem.destination == "Đà Lạt"
        assert mem.price_max == 5000000.0
        assert mem.people_count == 2

        # Third merge with same location should NOT overwrite (already set)
        store.merge_entities(
            "sid-merge",
            entities={"location": "Nha Trang"},
        )
        mem = store.get("sid-merge")
        assert mem.destination == "Đà Lạt"  # unchanged

    def test_merge_entities_records_turn_metadata(self):
        from agent.memory import SessionStore

        store = SessionStore()
        store.create("sid-turns")

        store.merge_entities(
            "sid-turns",
            entities={},
            selected_tool="search_tours",
            status="success",
            turn_content_len=20,
        )
        mem = store.get("sid-turns")
        assert len(mem.recent_turns) == 1
        assert mem.recent_turns[0]["selected_tool"] == "search_tours"
        assert mem.recent_turns[0]["status"] == "success"
        assert mem.recent_turns[0]["content_len"] == 20
        assert "timestamp" in mem.recent_turns[0]

    def test_merge_entities_caps_recent_turns(self):
        from agent.memory import SessionStore

        store = SessionStore()
        store.create("sid-caps")

        with patch("agent.memory._SESSION_MAX_TURNS", 3):
            for i in range(5):
                store.merge_entities(
                    "sid-caps",
                    entities={},
                    selected_tool="search_tours",
                    status="success",
                )

        mem = store.get("sid-caps")
        assert len(mem.recent_turns) == 3

    def test_cleanup_expired_removes_old_sessions(self):
        from agent.memory import SessionStore

        store = SessionStore()
        store.create("sid-old")

        with patch("agent.memory._SESSION_TTL_SECONDS", 1):
            import time
            # Manually age the session
            mem = store.get("sid-old")
            mem.updated_at = time.time() - 2  # 2 seconds ago > 1 second TTL

            removed = store.cleanup_expired()
            assert removed == 1
            assert store.get("sid-old") is None

    def test_get_or_create_returns_existing(self):
        from agent.memory import SessionStore

        store = SessionStore()
        existing = store.create("sid-existing")
        retrieved = store.get_or_create("sid-existing")

        assert retrieved is existing

    def test_get_or_create_generates_id_when_none(self):
        from agent.memory import SessionStore

        store = SessionStore()
        mem = store.get_or_create(None)

        assert mem.session_id is not None
        assert len(mem.session_id) > 0

    def test_session_memory_to_summary(self):
        from agent.memory import SessionStore

        store = SessionStore()
        store.create("sid-summary")
        store.merge_entities(
            "sid-summary",
            entities={"location": "Đà Lạt", "price_max": 5000000},
            selected_tool="search_tours",
            status="success",
        )
        mem = store.get("sid-summary")

        summary = mem.to_summary()
        assert summary["session_id"] == "sid-summary"
        assert summary["has_entities"] is True
        assert summary["entity_count"] == 2
        assert summary["last_tool"] == "search_tours"
        assert summary["turn_count"] == 1


# ---------------------------------------------------------------------------
# Memory entities helper tests
# ---------------------------------------------------------------------------

class TestMemoryEntitiesHelper:
    """Tests for _memory_to_entities in orchestrator."""

    def test_memory_to_entities_extracts_all_fields(self):
        from agent.memory import SessionMemory
        from agent.orchestrator import _memory_to_entities

        mem = SessionMemory(
            session_id="test",
            destination="Đà Lạt",
            destination_normalized="da-lat",
            date_start="2025-07-01",
            date_end="2025-07-03",
            price_min=1000000.0,
            price_max=5000000.0,
            people_count=2,
        )

        entities = _memory_to_entities(mem)
        assert entities["location"] == "Đà Lạt"
        assert entities["destination_normalized"] == "da-lat"
        assert entities["date_start"] == "2025-07-01"
        assert entities["date_end"] == "2025-07-03"
        assert entities["price_min"] == 1000000.0
        assert entities["price_max"] == 5000000.0
        assert entities["people_count"] == 2

    def test_memory_to_entities_skips_null_fields(self):
        from agent.memory import SessionMemory
        from agent.orchestrator import _memory_to_entities

        mem = SessionMemory(session_id="test")
        entities = _memory_to_entities(mem)
        assert entities == {}


# ---------------------------------------------------------------------------
# Orchestrator memory integration tests
# ---------------------------------------------------------------------------

class TestOrchestratorMemoryIntegration:
    """Tests that orchestrator integrates session memory correctly."""

    def test_first_request_creates_session_and_returns_session_id(self):
        from agent import AgentRequest, run

        req = AgentRequest(query="Tìm tour Đà Lạt")
        resp = run(req)

        assert resp.session_id is not None
        assert len(resp.session_id) > 0
        assert resp.memory_used is False

    def test_second_request_uses_same_session_id(self):
        from agent import AgentRequest, run

        req1 = AgentRequest(query="Tìm tour Đà Lạt")
        resp1 = run(req1)
        sid = resp1.session_id

        req2 = AgentRequest(query="Dưới 5 triệu", session_id=sid)
        resp2 = run(req2)

        assert resp2.session_id == sid
        assert resp2.memory_used is True
        # Merged entities should have both location and price
        assert resp2.entities.get("location") == "Đà Lạt"
        assert resp2.entities.get("price_max") == 5000000.0

    def test_reset_session_clears_memory(self):
        from agent import AgentRequest, run
        from agent.memory import get_session_store

        # First request — stores "Đà Lạt" in memory
        req1 = AgentRequest(query="Tìm tour Đà Lạt")
        resp1 = run(req1)
        sid = resp1.session_id

        # Verify memory has entities
        store = get_session_store()
        mem_before = store.get(sid)
        assert mem_before is not None
        assert mem_before.destination == "Đà Lạt"

        # Reset — new query "Tìm tour Sapa" has no shared entities
        req2 = AgentRequest(query="Tìm tour Sapa", session_id=sid, reset_session=True)
        resp2 = run(req2)

        # After reset, session is cleared (new session may have "Sa Pa" from current query)
        mem_after = store.get(resp2.session_id)
        assert mem_after is not None
        assert mem_after.destination is None or mem_after.destination == "Sa Pa"

    def test_second_request_uses_same_session_id(self):
        from agent import AgentRequest, run

        req1 = AgentRequest(query="Tìm tour Đà Lạt")
        resp1 = run(req1)
        sid = resp1.session_id
        assert sid is not None

        req2 = AgentRequest(query="Dưới 5 triệu", session_id=sid)
        resp2 = run(req2)

        assert resp2.session_id == sid
        assert resp2.memory_used is True
        # Merged entities should have both location from memory and price from current
        assert resp2.entities.get("location") == "Đà Lạt"
        assert resp2.entities.get("price_max") == 5000000.0

    def test_no_raw_query_text_stored_by_default(self):
        from agent import AgentRequest, run
        from agent.memory import get_session_store

        req = AgentRequest(query="Tìm tour Đà Lạt tháng 7 dưới 5 triệu cho 2 người")
        resp = run(req)

        store = get_session_store()
        mem = store.get(resp.session_id)
        # No raw text stored (unless DEBUG_MEMORY_STORE_TEXT=true)
        for turn in mem.recent_turns:
            assert "content" not in turn  # no raw content
            # content_len is stored
            assert "content_len" in turn
            assert turn["content_len"] == len(req.query)


# ---------------------------------------------------------------------------
# Follow-up routing tests
# ---------------------------------------------------------------------------

class TestFollowUpRouting:
    """Tests for memory-aware follow-up routing."""

    def test_followup_keyword_with_memory_routes_to_search_tours(self):
        from agent.router import DeterministicRouter

        router = DeterministicRouter()
        memory_context = {
            "entities": {"location": "Đà Lạt"},
            "last_selected_tool": "search_tours",
            "recent_turns_count": 1,
        }

        decision = router.route("rẻ hơn đi", memory_context=memory_context)
        assert decision.tool_name == "search_tours"
        assert decision.reason == "memory_followup"
        assert decision.entities.get("location") == "Đà Lạt"

    def test_followup_without_memory_routes_to_fallback(self):
        from agent.router import DeterministicRouter

        router = DeterministicRouter()
        decision = router.route("rẻ hơn đi", memory_context=None)
        assert decision.tool_name == "fallback_response"

    def test_tour_nữa_keyword_with_memory_routes_to_search_tours(self):
        from agent.router import DeterministicRouter

        router = DeterministicRouter()
        memory_context = {
            "entities": {"location": "Nha Trang", "date_start": "2025-08-01"},
            "last_selected_tool": "search_tours",
            "recent_turns_count": 1,
        }

        decision = router.route("còn tour nào nữa không", memory_context=memory_context)
        assert decision.tool_name == "search_tours"
        assert decision.reason == "memory_followup"

    def test_merges_entities_from_both_memory_and_current_query(self):
        from agent import AgentRequest, run

        req1 = AgentRequest(query="Tìm tour Đà Lạt")
        resp1 = run(req1)
        sid = resp1.session_id

        req2 = AgentRequest(
            query="Dưới 5 triệu",
            session_id=sid,
        )
        resp2 = run(req2)

        assert resp2.entities.get("location") == "Đà Lạt"
        assert resp2.entities.get("price_max") == 5000000.0
        assert resp2.selected_tool == "search_tours"


# ---------------------------------------------------------------------------
# Backend integration tests (mocked Express)
# ---------------------------------------------------------------------------

class TestBackendSessionIntegration:
    """Tests for session_id propagation through Express (mocked)."""

    def test_session_id_forwarded_to_agent_v2(self):
        with patch("agent.orchestrator.get_router") as mock_get_router:
            mock_router = MagicMock()
            mock_router.route.return_value = MagicMock(
                tool_name="search_tours",
                entities={"location": "Đà Lạt"},
                reason="tour_search_keyword",
                route_source="deterministic",
            )
            mock_get_router.return_value = mock_router

            with patch("agent.orchestrator.get_registry") as mock_registry:
                mock_reg = MagicMock()
                mock_reg.get.return_value = MagicMock()
                mock_reg.execute.return_value = {
                    "ok": True,
                    "status": "success",
                    "data": {"total": 1, "tours": []},
                }
                mock_registry.return_value = mock_reg

                from agent import AgentRequest, run

                req = AgentRequest(query="Tìm tour Đà Lạt", session_id="my-session-id")
                resp = run(req)

        assert resp.session_id == "my-session-id"
        assert resp.memory_used is False

    def test_session_id_generated_when_missing(self):
        with patch("agent.orchestrator.get_router") as mock_get_router:
            mock_router = MagicMock()
            mock_router.route.return_value = MagicMock(
                tool_name="fallback_response",
                entities={},
                reason="greeting",
                route_source="deterministic",
            )
            mock_get_router.return_value = mock_router

            with patch("agent.orchestrator.get_registry") as mock_registry:
                mock_reg = MagicMock()
                mock_reg.get.return_value = MagicMock()
                mock_reg.execute.return_value = {
                    "ok": True,
                    "status": "fallback",
                    "data": {"message": "Xin chào"},
                }
                mock_registry.return_value = mock_reg

                from agent import AgentRequest, run

                req = AgentRequest(query="Xin chào", session_id=None)
                resp = run(req)

        assert resp.session_id is not None
        assert len(resp.session_id) > 0
