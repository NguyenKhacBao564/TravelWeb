"""
AI Agent layer — tool registry, deterministic router, and orchestrator.

POST /agent/chat-v2 uses this package to route queries to typed tools
and return structured responses with a tool_trace.

This layer is additive and does not replace the existing POST /chat pipeline.
"""
from agent.orchestrator import run
from agent.router import DeterministicRouter, RouteDecision, get_router
from agent.schemas import AgentRequest, AgentResponse, AgentToolTrace
from agent.tool_registry import get_registry

__all__ = [
    "run",
    "AgentRequest",
    "AgentResponse",
    "AgentToolTrace",
    "DeterministicRouter",
    "RouteDecision",
    "get_router",
    "get_registry",
]
