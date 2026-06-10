"""
Orchestrator — coordinates routing, tool execution, and response building.

Receives an AgentRequest, uses the router to select a tool, executes it,
and returns an AgentResponse with a full tool_trace and session memory (Phase 3A).
"""
import logging
import time
from typing import Any

from agent.memory import get_session_store
from agent.router import RouteDecision, get_router, get_router_mode
from agent.schemas import AgentRequest, AgentResponse, AgentToolTrace
from agent.tool_registry import get_registry

logger = logging.getLogger(__name__)


def _build_memory_context(memory) -> dict:
    """Build a safe memory context dict for the router (no PII, no raw text)."""
    return {
        "entities": _memory_to_entities(memory),
        "last_selected_tool": memory.last_selected_tool,
        "last_status": memory.last_status,
        "recent_turns_count": len(memory.recent_turns),
    }


def _build_fallback_message(entities: dict, tool_status: str) -> str:
    """Build a friendly missing-info message from extracted entities."""
    parts = []
    if entities.get("location"):
        parts.append(f"địa điểm {entities['location']}")
    if entities.get("date_start"):
        parts.append(f"khởi hành {entities['date_start']}")
    if entities.get("price_max"):
        parts.append(f"ngân sách {int(entities['price_max']):,}đ")

    if parts:
        return (
            f"Em hiểu bạn muốn tìm tour {' '.join(parts)}. "
            f"Bạn có thể cho em biết thêm thông tin để em tìm tour phù hợp nhất nhé!"
        )
    if tool_status == "error":
        return "Xin lỗi, hệ thống đang gặp sự cố. Vui lòng thử lại sau."
    return "Em chưa hiểu ý bạn lắm. Bạn muốn đi du lịch ở đâu ạ?"


def _result_summary(tool_name: str, tool_result: dict) -> str:
    """Build a one-line human-readable summary from a tool result."""
    if not tool_result.get("ok", False):
        return f"{tool_name} failed: {tool_result.get('error_type', 'unknown')}"

    data = tool_result.get("data")
    if tool_name == "search_tours" and isinstance(data, dict):
        total = data.get("total", 0)
        return f"search_tours returned {total} tour(s)"

    if tool_name == "get_tour_detail" and isinstance(data, dict):
        tour = data.get("tour")
        if tour:
            return f"get_tour_detail: {tour.get('name', 'tour')}"
        return "get_tour_detail: tour not found"

    if tool_name == "fallback_response":
        msg = (data.get("message") or "") if isinstance(data, dict) else ""
        return msg[:80] + ("..." if len(msg) > 80 else "")

    return f"{tool_name} ok"


def run(request: AgentRequest) -> AgentResponse:
    """
    Main orchestrator entry point (Phase 3A: session-aware).

    1. Handle reset_session if requested
    2. Load or create session memory
    3. Route the query to a tool (mode-aware)
    4. Validate the tool is registered
    5. Execute it (max one tool in Phase 2A)
    6. Update session memory with entities and turn metadata
    7. Build AgentResponse with tool_trace, route_source, and session fields
    """
    store = get_session_store()

    # Step 1: reset session if requested
    if request.reset_session and request.session_id:
        store.reset(request.session_id)

    # Step 2: load or create session memory
    memory = store.get_or_create(request.session_id, request.user_id)
    session_id = memory.session_id

    # Build merged entities: current query entities will be merged with memory later
    # First, extract entities from the query
    router = get_router()
    registry = get_registry()

    # Build memory context dict for the router
    memory_context = _build_memory_context(memory)

    # Step 3: route — pass query and memory context
    decision = router.route(request.query, memory_context=memory_context)
    selected_tool = decision.tool_name
    route_source = decision.route_source or get_router_mode()

    # Merge memory entities with extracted ones: memory fills in None slots
    memory_entities = _memory_to_entities(memory)
    merged_entities = {**decision.entities}
    for key, val in memory_entities.items():
        if merged_entities.get(key) is None and val is not None:
            merged_entities[key] = val

    # Memory was used if it contributed at least one entity to the final merged set
    memory_used = bool(
        memory_entities and any(merged_entities.get(k) is not None for k in memory_entities)
    )

    # Step 4: validate
    tool_def = registry.get(selected_tool)
    if tool_def is None:
        selected_tool = "fallback_response"
        tool_def = registry.get("fallback_response")
        decision = RouteDecision(tool_name="fallback_response", entities={}, reason="unknown_tool")

    # Step 5: execute
    tool_result: dict[str, Any] = {}
    start = time.monotonic()

    try:
        tool_result = registry.execute(
            selected_tool,
            request_id=getattr(request, "request_id", None),
            query=request.query,
            **merged_entities,
        )
    except Exception as exc:
        logger.warning("Tool %s raised %s: %s", selected_tool, type(exc).__name__, exc)
        tool_result = {
            "ok": False,
            "status": "error",
            "tool": selected_tool,
            "data": None,
            "error_type": "tool_exception",
            "latency_ms": round((time.monotonic() - start) * 1000, 1),
        }

    latency_ms = round((time.monotonic() - start) * 1000, 1)
    tool_status = "success" if tool_result.get("ok") else "error"
    error_type = tool_result.get("error_type") if not tool_result.get("ok") else None

    tool_trace = [
        AgentToolTrace(
            step=1,
            selected_tool=selected_tool,
            tool_status=tool_status,
            latency_ms=latency_ms,
            error_type=error_type,
            result_summary=_result_summary(selected_tool, tool_result),
        )
    ]

    # Step 6: update session memory
    final_status_for_memory = tool_result.get("status", "error")
    tour_ids = _extract_tour_ids(selected_tool, tool_result)
    store.merge_entities(
        session_id=session_id,
        entities=merged_entities,
        intent=decision.reason,
        selected_tool=selected_tool,
        status=final_status_for_memory,
        tour_ids=tour_ids,
        turn_content_len=len(request.query),
    )

    # Step 7: build response
    ok = tool_result.get("ok", False)
    data = tool_result.get("data") if ok else None
    tool_status_for_response = tool_result.get("status", "error")

    if tool_status_for_response == "fallback":
        final_status = "fallback"
        message = (
            (data.get("message") if isinstance(data, dict) else str(data))
            if data else _build_fallback_message(merged_entities, "error")
        )
    elif not ok:
        final_status = "error"
        message = _build_fallback_message(merged_entities, "error")
    elif data and isinstance(data, dict) and data.get("total", 0) == 0:
        final_status = "no_results"
        message = _build_fallback_message(merged_entities, "no_results")
    elif selected_tool == "fallback_response":
        final_status = "fallback"
        message = (
            (data.get("message") if isinstance(data, dict) else str(data))
            if data else _build_fallback_message(merged_entities, "error")
        )
    else:
        final_status = "success"
        if data and isinstance(data, dict) and data.get("message"):
            message = data["message"]
        else:
            message = _build_fallback_message(merged_entities, "success")

    return AgentResponse(
        status=final_status,
        message=message,
        selected_tool=selected_tool,
        entities=merged_entities,
        tool_trace=tool_trace,
        data=data,
        route_source=route_source,
        session_id=session_id,
        memory_used=memory_used,
    )


def _memory_to_entities(memory) -> dict:
    """Extract entity dict from a SessionMemory record."""
    result = {}
    if memory.destination:
        result["location"] = memory.destination
    if memory.destination_normalized:
        result["destination_normalized"] = memory.destination_normalized
    if memory.date_start:
        result["date_start"] = memory.date_start
    if memory.date_end:
        result["date_end"] = memory.date_end
    if memory.price_min is not None:
        result["price_min"] = memory.price_min
    if memory.price_max is not None:
        result["price_max"] = memory.price_max
    if memory.people_count is not None:
        result["people_count"] = memory.people_count
    return result


def _extract_tour_ids(tool_name: str, tool_result: dict) -> list[str]:
    """Extract up to 5 tour IDs from a tool result."""
    if tool_name != "search_tours":
        return []
    data = tool_result.get("data")
    if not isinstance(data, dict):
        return []
    tours = data.get("tours") or []
    if not isinstance(tours, list):
        return []
    return [t.get("tour_id") for t in tours[:5] if t.get("tour_id")]
