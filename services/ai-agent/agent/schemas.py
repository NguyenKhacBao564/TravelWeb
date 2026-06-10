"""
Agent schemas — Pydantic models for the AI agent layer.

These define the stable API contract for POST /agent/chat-v2.
"""
from typing import Any, Literal, Optional

from pydantic import BaseModel, Field


class AgentRequest(BaseModel):
    """Incoming request to the agent."""

    query: str = Field(..., min_length=1, max_length=500)
    user_id: Optional[str] = Field(default=None, max_length=100)
    session_id: Optional[str] = Field(default=None, max_length=100)


class AgentToolTrace(BaseModel):
    """One step in the tool execution trace."""

    step: int = Field(..., ge=1)
    selected_tool: str = Field(..., description="Name of the tool that was selected")
    tool_status: Literal["success", "error", "skipped"] = Field(...)
    latency_ms: float = Field(..., ge=0)
    error_type: Optional[str] = Field(default=None)
    result_summary: Optional[str] = Field(
        default=None,
        description="Human-readable one-line summary of the result"
    )


class AgentResponse(BaseModel):
    """Outgoing response from the agent.

    Always includes a tool_trace. Never exposes raw chain-of-thought.
    """

    status: Literal[
        "success",
        "no_results",
        "missing_info",
        "faq",
        "fallback",
        "error",
    ] = Field(...)
    message: str = Field(..., description="Human-readable response to the user")
    selected_tool: str = Field(
        ...,
        description="Tool that was used: search_tours | get_tour_detail | fallback_response"
    )
    entities: dict[str, Any] = Field(default_factory=dict)
    tool_trace: list[AgentToolTrace] = Field(default_factory=list)
    data: Optional[dict[str, Any]] = Field(default=None)
    route_source: Optional[str] = Field(
        default=None,
        description="Router mode used: deterministic | gemini | deterministic_fallback | gemini_fallback"
    )
