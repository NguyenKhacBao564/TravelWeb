"""
Deterministic Router — selects a tool based on rules, no Gemini needed.

Routing logic:
1. Greeting / empty query → fallback_response
2. Out-of-domain keywords → fallback_response
3. Tour detail pattern (tour_id in query) → get_tour_detail
4. Tour search keywords → search_tours
5. Default → fallback_response

Extraction uses lightweight existing extractors where available.
"""
from __future__ import annotations

import logging
import os
import re
from dataclasses import dataclass, field
from typing import TYPE_CHECKING, Optional

from pydantic import BaseModel

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Result types
# ---------------------------------------------------------------------------

@dataclass
class RouteDecision:
    tool_name: str
    entities: dict = field(default_factory=dict)
    reason: str = ""
    route_source: str = "deterministic"


@dataclass
class ExtractedEntities:
    location: Optional[str] = None
    destination_normalized: Optional[str] = None
    date_start: Optional[str] = None
    date_end: Optional[str] = None
    price_min: Optional[float] = None
    price_max: Optional[float] = None
    people_count: Optional[int] = None
    tour_id: Optional[str] = None

    def to_dict(self) -> dict:
        result = {}
        if self.location:
            result["location"] = self.location
        if self.destination_normalized:
            result["destination_normalized"] = self.destination_normalized
        if self.date_start:
            result["date_start"] = self.date_start
        if self.date_end:
            result["date_end"] = self.date_end
        if self.price_min is not None:
            result["price_min"] = self.price_min
        if self.price_max is not None:
            result["price_max"] = self.price_max
        if self.people_count is not None:
            result["people_count"] = self.people_count
        if self.tour_id:
            result["tour_id"] = self.tour_id
        return result


# ---------------------------------------------------------------------------
# Keyword sets
# ---------------------------------------------------------------------------

_GREETING_PATTERNS = re.compile(
    r"^(xin\s*chào|chào|hello|hi|hey|chào\s*bạn|chào\s*em|hello\s*anh|hello\s*chị)\b",
    re.IGNORECASE,
)

_TOUR_SEARCH_KEYWORDS = re.compile(
    r"\b("
    r"tìm\s*tour|tìm\s*đi|tìm\s*tour\s*đi|"
    r"tìm\s*vé|tìm\s*chuyến|tìm\s*lịch|"
    r"đặt\s*tour|đặt\s*chuyến|"
    r"có\s*tour|có\s*chuyến|có\s*lịch|"
    r"tour\s*nào|tour\s*gì|tour\s*nào|tour\s*ở|"
    r"muốn\s*đi|mún\s*đi|mình\s*đi|"
    r"đi\s*du\s*lịch|đi\s*tour|đi\s*đâu|"
    r"cho\s*tour|giới\s*thiệu\s*tour|"
    r"tour\s*từ|tour\s*đến|tour\s*bắt\s*đầu|"
    r"khám\s*phá\s*tour|xem\s*tour|"
    r"lịch\s*trình|tour\s*bao\s*nhiêu|"
    r"giá\s*tour|tour\s*giá|chi\s*phí\s*tour"
    r")",
    re.IGNORECASE,
)

_OUT_OF_DOMAIN_PATTERNS = re.compile(
    r"\b("
    r"làm\s*thế\s*nào\s*để\s*mua\s*điện\s*thoại|"
    r"cách\s*nấu\s*phở|cách\s*nấu\s*bún|"
    r"thời\s*tiết\s*ở\s*mars|"
    r"lập\s*trình\s*python|cách\s*viết\s*code|"
    r"mua\s*cổ\s*phiếu|mua\s*vàng|"
    r"chữa\s*bệnh\s*ung\s*thư|cách\s*giảm\s*cân"
    r")",
    re.IGNORECASE,
)

_TOUR_ID_PATTERNS = re.compile(
    r"\b(TOUR[\w-]{2,20}|tour[_\s-]?id[:\s]+[\w-]{2,20})",
    re.IGNORECASE,
)

# ---------------------------------------------------------------------------
# Router class
# ---------------------------------------------------------------------------

class DeterministicRouter:
    """Rule-based router that selects a tool based on keyword/pattern matching."""

    def route(self, query: str) -> RouteDecision:
        """
        Return a RouteDecision for the given query.

        Steps:
        1. Extract entities (location, price, time, tour_id) from the query
        2. Apply routing rules
        """
        if not query or not isinstance(query, str):
            return RouteDecision(
                tool_name="fallback_response",
                entities={},
                reason="empty_or_invalid_query",
            )

        query_stripped = query.strip()
        query_lower = query_stripped.lower()

        # Step 1: extract entities first (needed for routing decisions)
        entities = self._extract_entities(query_stripped)

        # Step 2: routing rules
        if _GREETING_PATTERNS.match(query_stripped):
            return RouteDecision(
                tool_name="fallback_response",
                entities=entities.to_dict(),
                reason="greeting",
            )

        if _OUT_OF_DOMAIN_PATTERNS.search(query_stripped):
            return RouteDecision(
                tool_name="fallback_response",
                entities=entities.to_dict(),
                reason="out_of_domain",
            )

        if entities.tour_id:
            return RouteDecision(
                tool_name="get_tour_detail",
                entities=entities.to_dict(),
                reason="tour_id_detected",
            )

        if _TOUR_SEARCH_KEYWORDS.search(query_stripped):
            return RouteDecision(
                tool_name="search_tours",
                entities=entities.to_dict(),
                reason="tour_search_keyword",
            )

        # Default: try to do a tour search if any entities were found
        if any([
            entities.location,
            entities.destination_normalized,
            entities.date_start,
            entities.price_max,
        ]):
            return RouteDecision(
                tool_name="search_tours",
                entities=entities.to_dict(),
                reason="entities_found_assume_tour_search",
            )

        return RouteDecision(
            tool_name="fallback_response",
            entities={},
            reason="no_match",
        )

    def _extract_entities(self, query: str) -> ExtractedEntities:
        """Extract entities using existing lightweight extractors."""
        entities = ExtractedEntities()

        # Location — uses existing extractor
        try:
            from extractors.extract_location import extract_location
            loc = extract_location(query)
            if loc:
                entities.location = loc
        except Exception:
            pass

        # Price — uses existing extractor
        try:
            from extractors.extract_price import extract_price_values
            prices = extract_price_values(query)
            if prices:
                max_price = max(prices)
                if max_price < 1000:
                    max_price = max_price * 1_000_000
                entities.price_max = float(max_price)
        except Exception:
            pass

        # Time — uses existing extractor
        try:
            from extractors.extract_time import extract_time
            date_val = extract_time(query)
            if date_val:
                if "-" in date_val and len(date_val) == 10:
                    entities.date_start = date_val
                elif "-" in date_val:
                    entities.date_start = date_val + "-01"
        except Exception:
            pass

        # Tour ID — regex
        tour_id_match = _TOUR_ID_PATTERNS.search(query)
        if tour_id_match:
            raw = tour_id_match.group(0)
            # Strip prefix
            entities.tour_id = re.sub(r"^tour[_\s-]?id[:\s]*", "", raw, flags=re.IGNORECASE).strip()

        return entities


# ---------------------------------------------------------------------------
# Singleton factory
# ---------------------------------------------------------------------------

def _build_router():
    mode = os.getenv("AGENT_ROUTER_MODE", "deterministic").lower()
    if mode == "gemini":
        from agent.gemini_router import gemini_route
        return _GeminiProxyRouter()
    if mode == "hybrid":
        from agent.hybrid_router import HybridRouter
        return HybridRouter()
    # deterministic (default)
    return _router


class _GeminiProxyRouter:
    """Wrapper that calls gemini_route and returns a RouteDecision."""

    def route(self, query: str):
        from agent.gemini_router import gemini_route
        return gemini_route(query)


_router = DeterministicRouter()


def get_router() -> "DeterministicRouter | _GeminiProxyRouter | HybridRouter":
    return _build_router()


def get_router_mode() -> str:
    """Return the active router mode string."""
    return os.getenv("AGENT_ROUTER_MODE", "deterministic").lower()
