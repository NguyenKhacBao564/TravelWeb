"""
Hybrid Router — deterministic for obvious cases, Gemini for ambiguous queries.

Uses the deterministic router to pre-classify queries:
- Greeting, empty, out-of-domain → deterministic (fast, no API call)
- Queries with clear tour_id pattern → deterministic (get_tour_detail)
- Ambiguous travel queries → delegate to Gemini

Falls back to deterministic on any Gemini failure.
"""
import logging

from agent.gemini_router import gemini_route
from agent.router import DeterministicRouter, RouteDecision

logger = logging.getLogger(__name__)

# Routes that are obvious enough for deterministic-only handling
_DETERMINISTIC_ONLY_REASONS = {
    "greeting",
    "empty_or_invalid_query",
    "out_of_domain",
    "tour_id_detected",
}


class HybridRouter:
    """
    Hybrid router: deterministic for clear cases, Gemini for ambiguous travel queries.

    Falls back to deterministic on any Gemini error.
    """

    def __init__(self) -> None:
        self._det = DeterministicRouter()

    def route(self, query: str, memory_context=None) -> RouteDecision:
        """
        Route a query.

        Uses deterministic router first. If the result is obvious (greeting, tour_id,
        out-of-domain), returns immediately. Otherwise delegates to Gemini.
        On Gemini failure, falls back to the deterministic result.
        """
        det_result = self._det.route(query, memory_context=memory_context)

        # Use deterministic directly for obvious cases
        if det_result.reason in _DETERMINISTIC_ONLY_REASONS:
            return det_result

        # For tour search keywords or entity-based routing, try deterministic first
        # Gemini is for ambiguous queries where deterministic is uncertain
        if det_result.reason in ("tour_search_keyword", "entities_found_assume_tour_search", "memory_followup"):
            # Deterministic has a clear signal — use it directly
            return det_result

        # Ambiguous case: let Gemini decide
        try:
            gemini_result = gemini_route(query)
            return gemini_result
        except Exception as exc:
            logger.warning("Hybrid router: Gemini failed — %s — using deterministic fallback", exc)
            det_result.route_source = "deterministic_fallback"
            return det_result
