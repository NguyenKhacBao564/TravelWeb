"""
Orchestrator — coordinates routing, tool execution, and response building.

Receives an AgentRequest, uses the router to select a tool, executes it,
and returns an AgentResponse with a full tool_trace.
"""
import logging
import time
from typing import Any

from agent.router import RouteDecision, get_router, get_router_mode
from agent.schemas import AgentRequest, AgentResponse, AgentToolTrace
from agent.tool_registry import get_registry

logger = logging.getLogger(__name__)


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
    Main orchestrator entry point.

    1. Route the query to a tool (mode-aware)
    2. Validate the tool is registered
    3. Execute it (max one tool in Phase 2A)
    4. Build AgentResponse with tool_trace and route_source
    """
    router = get_router()
    registry = get_registry()

    # Step 1: route
    decision = router.route(request.query)
    selected_tool = decision.tool_name
    route_source = decision.route_source or get_router_mode()

    # Step 2: validate
    tool_def = registry.get(selected_tool)
    if tool_def is None:
        selected_tool = "fallback_response"
        tool_def = registry.get("fallback_response")
        decision = RouteDecision(tool_name="fallback_response", entities={}, reason="unknown_tool")

    # Step 3: execute (max one tool in Phase 2A)
    tool_result: dict[str, Any] = {}
    start = time.monotonic()

    try:
        tool_result = registry.execute(
            selected_tool,
            query=request.query,
            entities=decision.entities,
            request_id=getattr(request, "request_id", None),
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

    # Step 4: build response
    ok = tool_result.get("ok", False)
    data = tool_result.get("data") if ok else None
    tool_status_for_response = tool_result.get("status", "error")

    if tool_status_for_response == "fallback":
        final_status = "fallback"
        message = (
            (data.get("message") if isinstance(data, dict) else str(data))
            if data else _build_fallback_message(decision.entities, "error")
        )
    elif not ok:
        final_status = "error"
        message = _build_fallback_message(decision.entities, "error")
    elif data and isinstance(data, dict) and data.get("total", 0) == 0:
        final_status = "no_results"
        message = _build_fallback_message(decision.entities, "no_results")
    elif selected_tool == "fallback_response":
        final_status = "fallback"
        message = (
            (data.get("message") if isinstance(data, dict) else str(data))
            if data else _build_fallback_message(decision.entities, "error")
        )
    else:
        final_status = "success"
        if data and isinstance(data, dict) and data.get("message"):
            message = data["message"]
        else:
            message = _build_fallback_message(decision.entities, "success")

    return AgentResponse(
        status=final_status,
        message=message,
        selected_tool=selected_tool,
        entities=decision.entities,
        tool_trace=tool_trace,
        data=data,
        route_source=route_source,
    )
