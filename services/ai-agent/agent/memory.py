"""
Session Memory — in-process TTL store for multi-turn travel query context.

Phase 3A scope (MVP only):
- In-process Python dict (no Redis, no database)
- TTL-based expiry (default 24h, configurable via SESSION_TTL_SECONDS)
- Max turns cap (default 10, configurable via SESSION_MAX_TURNS)
- No raw query text stored by default (content_len only)
- Thread-safe operations via threading.Lock

What this stores:
- Entities (location, date, price, people) accumulated across turns
- Last selected tool and status
- last_recommended_tour_ids from search_tours results
- Recent turn metadata (role, content_len, status, selected_tool, timestamp)

What this does NOT store:
- Raw full conversation text (unless DEBUG_MEMORY_STORE_TEXT=true)
- API keys, tokens, or secrets
- Chain-of-thought or reasoning traces
"""
from __future__ import annotations

import logging
import os
import threading
import time
import uuid
from dataclasses import dataclass, field
from typing import Any, Optional

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

_SESSION_TTL_SECONDS: int = int(os.getenv("SESSION_TTL_SECONDS", "86400"))
_SESSION_MAX_TURNS: int = int(os.getenv("SESSION_MAX_TURNS", "10"))
_DEBUG_STORE_TEXT: bool = os.getenv("DEBUG_MEMORY_STORE_TEXT", "false").lower() == "true"


# ---------------------------------------------------------------------------
# Session data model
# ---------------------------------------------------------------------------

@dataclass
class SessionMemory:
    """
    Per-session memory record.

    Stores structured entity accumulation and recent turn metadata only.
    No raw query text unless DEBUG_MEMORY_STORE_TEXT=true.
    """

    session_id: str
    user_id: Optional[str] = None

    # Accumulated travel constraints
    destination: Optional[str] = None
    destination_normalized: Optional[str] = None
    date_start: Optional[str] = None
    date_end: Optional[str] = None
    price_min: Optional[float] = None
    price_max: Optional[float] = None
    people_count: Optional[int] = None

    # Last action
    last_intent: Optional[str] = None
    last_selected_tool: Optional[str] = None
    last_status: Optional[str] = None
    last_recommended_tour_ids: list[str] = field(default_factory=list)

    # Recent turn metadata only (no raw text unless debug mode)
    recent_turns: list[dict] = field(default_factory=list)

    updated_at: float = field(default_factory=lambda: time.time())
    created_at: float = field(default_factory=lambda: time.time())

    def is_expired(self) -> bool:
        return (time.time() - self.updated_at) > _SESSION_TTL_SECONDS

    def to_summary(self) -> dict:
        """Return a safe, non-PII summary for logging/debugging."""
        return {
            "session_id": self.session_id,
            "has_entities": bool(
                self.destination
                or self.destination_normalized
                or self.date_start
                or self.date_end
                or self.price_min
                or self.price_max
                or self.people_count
            ),
            "entity_count": sum(
                1
                for v in (
                    self.destination,
                    self.destination_normalized,
                    self.date_start,
                    self.date_end,
                    self.price_min,
                    self.price_max,
                    self.people_count,
                )
                if v is not None
            ),
            "last_tool": self.last_selected_tool,
            "last_status": self.last_status,
            "turn_count": len(self.recent_turns),
            "recommended_tours": len(self.last_recommended_tour_ids),
        }


# ---------------------------------------------------------------------------
# Session Store
# ---------------------------------------------------------------------------

class SessionStore:
    """
    Thread-safe in-process session store with TTL expiry and max-turn cap.

    All operations are thread-safe via threading.Lock.
    Expired sessions are lazily cleaned up on access.
    """

    def __init__(self) -> None:
        self._store: dict[str, SessionMemory] = {}
        self._lock = threading.Lock()
        self._start_cleanup_thread()

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def get(self, session_id: str) -> Optional[SessionMemory]:
        """
        Retrieve a session by ID.

        Returns None if the session does not exist or has expired.
        Cleans up expired sessions lazily.
        """
        if not session_id:
            return None

        with self._lock:
            memory = self._store.get(session_id)
            if memory is None:
                return None
            if memory.is_expired():
                del self._store[session_id]
                return None
            return memory

    def create(self, session_id: str, user_id: Optional[str] = None) -> SessionMemory:
        """
        Create a new session, replacing any existing session with the same ID.

        Returns the newly created SessionMemory.
        """
        if not session_id:
            session_id = self._generate_id()

        with self._lock:
            memory = SessionMemory(session_id=session_id, user_id=user_id)
            self._store[session_id] = memory
            return memory

    def get_or_create(self, session_id: Optional[str], user_id: Optional[str] = None) -> SessionMemory:
        """
        Return existing session if valid, otherwise create a new one.

        If session_id is None, always creates a new session with a generated ID.
        """
        if session_id:
            existing = self.get(session_id)
            if existing is not None:
                return existing
        return self.create(session_id or self._generate_id(), user_id)

    def reset(self, session_id: str) -> bool:
        """
        Delete a session entirely.

        Returns True if the session existed, False otherwise.
        """
        if not session_id:
            return False
        with self._lock:
            if session_id in self._store:
                del self._store[session_id]
                return True
            return False

    def merge_entities(
        self,
        session_id: str,
        entities: dict,
        intent: Optional[str] = None,
        selected_tool: Optional[str] = None,
        status: Optional[str] = None,
        tour_ids: Optional[list[str]] = None,
        turn_content_len: Optional[int] = None,
    ) -> None:
        """
        Merge new entities into an existing session, updating only non-None fields.

        Also records a recent turn metadata entry.

        Args:
            session_id: Session to update
            entities: Dict with keys like location, date_start, price_max, people_count, etc.
            intent: Intent string for the turn
            selected_tool: Tool selected for this turn
            status: Status of this turn (success, no_results, fallback, error)
            tour_ids: List of tour IDs recommended in this turn
            turn_content_len: Length of the user's query string (not the text itself)
        """
        if not session_id:
            return

        memory = self.get(session_id)
        if memory is None:
            return

        # Merge entities — only fill in None fields
        raw = entities or {}

        def _set_if_present(attr_name: str, entity_key: str, converter=None):
            val = raw.get(entity_key)
            if val is not None and val != "" and val != "null":
                current = getattr(memory, attr_name, None)
                if current is None:
                    setattr(
                        memory,
                        attr_name,
                        converter(val) if converter else val,
                    )

        _set_if_present("destination", "location")
        _set_if_present("destination_normalized", "destination_normalized")
        _set_if_present("date_start", "date_start")
        _set_if_present("date_end", "date_end")

        def _to_float(v):
            return float(v) if v is not None else None

        def _to_int(v):
            try:
                return int(v)
            except (TypeError, ValueError):
                return None

        _set_if_present("price_min", "price_min", _to_float)
        _set_if_present("price_max", "price_max", _to_float)
        _set_if_present("people_count", "people_count", _to_int)

        # Update last action fields
        if selected_tool is not None:
            memory.last_selected_tool = selected_tool
        if status is not None:
            memory.last_status = status
        if intent is not None:
            memory.last_intent = intent
        if tour_ids:
            memory.last_recommended_tour_ids = tour_ids[:5]  # cap at 5

        # Record turn metadata (no raw text unless debug mode)
        turn_entry: dict[str, Any] = {
            "timestamp": time.time(),
            "selected_tool": selected_tool,
            "status": status,
        }
        if _DEBUG_STORE_TEXT and turn_content_len is not None:
            turn_entry["content_len"] = turn_content_len
        elif turn_content_len is not None:
            turn_entry["content_len"] = turn_content_len

        memory.recent_turns.append(turn_entry)

        # Cap recent_turns to SESSION_MAX_TURNS
        max_turns = _SESSION_MAX_TURNS
        if len(memory.recent_turns) > max_turns:
            memory.recent_turns = memory.recent_turns[-max_turns:]

        memory.updated_at = time.time()

    def cleanup_expired(self) -> int:
        """
        Remove all expired sessions.

        Returns the number of sessions removed.
        """
        removed = 0
        with self._lock:
            expired = [
                sid for sid, mem in self._store.items() if mem.is_expired()
            ]
            for sid in expired:
                del self._store[sid]
                removed += 1
        if removed:
            logger.debug("SessionStore: cleaned up %d expired sessions", removed)
        return removed

    def stats(self) -> dict:
        """Return store statistics for monitoring."""
        with self._lock:
            total = len(self._store)
            expired = sum(1 for m in self._store.values() if m.is_expired())
            return {
                "total_sessions": total,
                "expired_sessions": expired,
                "active_sessions": total - expired,
            }

    # ------------------------------------------------------------------
    # Private
    # ------------------------------------------------------------------

    @staticmethod
    def _generate_id() -> str:
        return str(uuid.uuid4())

    def _start_cleanup_thread(self) -> None:
        def _cleanup_loop():
            interval = min(_SESSION_TTL_SECONDS, 3600)  # max 1 hour interval
            while True:
                time.sleep(interval)
                try:
                    self.cleanup_expired()
                except Exception as exc:
                    logger.warning("SessionStore cleanup error: %s", exc)

        t = threading.Thread(target=_cleanup_loop, daemon=True, name="session-cleanup")
        t.start()


# ---------------------------------------------------------------------------
# Module-level singleton
# ---------------------------------------------------------------------------

_store: Optional[SessionStore] = None


def get_session_store() -> SessionStore:
    """Return the global SessionStore singleton."""
    global _store
    if _store is None:
        _store = SessionStore()
    return _store
