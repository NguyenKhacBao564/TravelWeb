"""
Tool Registry — central registry of available agent tools.

Each tool is a dict with:
  name        — unique identifier (used in tool_trace)
  description — human-readable description
  input_fields — list of field names the tool accepts
  callable    — callable(query, entities, request_id) -> dict (express_tools_client result)
"""
import logging
from typing import Any, Callable, Optional

logger = logging.getLogger(__name__)


class ToolRegistry:
    """Registry of available tools. Initialised once at module load."""

    def __init__(self) -> None:
        self._tools: dict[str, dict[str, Any]] = {}

    def register(
        self,
        name: str,
        description: str,
        input_fields: list[str],
        callable: Callable[..., Any],
    ) -> None:
        if name in self._tools:
            logger.warning("Tool %s is already registered — overwriting", name)
        self._tools[name] = {
            "name": name,
            "description": description,
            "input_fields": input_fields,
            "callable": callable,
        }

    def get(self, name: str) -> Optional[dict[str, Any]]:
        return self._tools.get(name)

    def list_tools(self) -> list[dict[str, Any]]:
        return [
            {
                "name": t["name"],
                "description": t["description"],
                "input_fields": t["input_fields"],
            }
            for t in self._tools.values()
        ]

    def execute(self, name: str, **kwargs: Any) -> Any:
        tool = self.get(name)
        if tool is None:
            raise ValueError(f"Tool '{name}' is not registered")
        return tool["callable"](**kwargs)


# ---------------------------------------------------------------------------
# Singleton registry instance
# ---------------------------------------------------------------------------

_registry = ToolRegistry()


def get_registry() -> ToolRegistry:
    return _registry


# ---------------------------------------------------------------------------
# Built-in tools (registered at import time)
# ---------------------------------------------------------------------------

def _fallback_response(query: str, entities: dict, request_id: Optional[str] = None) -> dict:
    """
    Deterministic fallback when no other tool matches.
    Returns a structured response without calling Gemini.
    """
    query_lower = query.lower().strip()

    greeting_words = {"xin chào", "chào", "hello", "hi", "hey", "chào bạn", "chào em", "hello anh", "hello chị"}
    if query_lower in greeting_words or query_lower.startswith("chào "):
        return {
            "ok": True,
            "status": "fallback",
            "tool": "fallback_response",
            "data": {
                "message": "Xin chào! Em là trợ lý du lịch của TravelWeb. Em có thể giúp bạn tìm tour, hỏi về địa điểm du lịch hoặc giá tour. Bạn cần hỗ trợ gì ạ?",
                "suggestions": ["Tìm tour Đà Lạt", "Tour Nha Trang", "Tour Phú Quốc"],
            },
            "error_type": None,
            "latency_ms": 0.0,
        }

    return {
        "ok": True,
        "status": "fallback",
        "tool": "fallback_response",
        "data": {
            "message": "Xin lỗi, em chưa hiểu ý bạn lắm. Em có thể giúp bạn tìm tour du lịch theo địa điểm, ngày khởi hành và ngân sách. Bạn muốn đi đâu ạ?",
            "suggestions": ["Tìm tour Đà Lạt", "Tour Nha Trang", "Tour Phú Quốc"],
        },
        "error_type": None,
        "latency_ms": 0.0,
    }


_registry.register(
    name="search_tours",
    description="Search for tours by destination, date, price, and number of travellers.",
    input_fields=[
        "location",
        "destination_normalized",
        "date_start",
        "date_end",
        "price_min",
        "price_max",
        "people_count",
        "limit",
        "request_id",
    ],
    callable=lambda **kwargs: _lazy_search_tours(**kwargs),
)


def _lazy_search_tours(**kwargs: Any) -> dict:
    """Lazily import to avoid circular import at module load."""
    from services.tools.search_tours_tool import search_tours_tool
    return search_tours_tool(**kwargs)


_registry.register(
    name="get_tour_detail",
    description="Get detailed information about a specific tour by tour_id.",
    input_fields=["tour_id", "request_id"],
    callable=lambda **kwargs: _lazy_get_tour_detail(**kwargs),
)


def _lazy_get_tour_detail(**kwargs: Any) -> dict:
    """Lazily import to avoid circular import at module load."""
    from services.tools.get_tour_detail_tool import get_tour_detail_tool
    return get_tour_detail_tool(**kwargs)


_registry.register(
    name="fallback_response",
    description="Provides a greeting or out-of-domain fallback message when no other tool matches.",
    input_fields=["query", "entities", "request_id"],
    callable=_fallback_response,
)
