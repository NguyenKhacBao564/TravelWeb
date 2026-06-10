"""
AI Agent layer — tool registry, deterministic router, Gemini router, hybrid router, and orchestrator.

POST /agent/chat-v2 uses this package to route queries to typed tools
and return structured responses with a tool_trace.

Router mode is controlled by AGENT_ROUTER_MODE env var:
  deterministic — rule-based keyword/pattern matching (default)
  gemini       — Gemini structured JSON output
  hybrid      — deterministic for clear cases, Gemini for ambiguous queries
"""
from agent.orchestrator import run
from agent.router import (
    DeterministicRouter,
    RouteDecision,
    get_router,
    get_router_mode,
)
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
    "get_router_mode",
    "get_registry",
]
