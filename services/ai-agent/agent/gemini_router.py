"""
Gemini Structured Router — selects a tool via Gemini JSON output.

This router is additive and never replaces the deterministic router.
It is only active when AGENT_ROUTER_MODE=gemini or AGENT_ROUTER_MODE=hybrid.

Safety guarantees:
- Invalid JSON, unknown tool, timeout, or API error → falls back to deterministic.
- No chain-of-thought is exposed — only structured RouteDecision fields.
- The Gemini prompt does not include user query as context for answer generation.
"""
import json
import logging
import os
import re
from typing import Optional

from agent.router import DeterministicRouter, RouteDecision
from agent.tool_registry import get_registry

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

_ROUTER_MODE = os.getenv("AGENT_ROUTER_MODE", "deterministic").lower()
_ROUTER_MODEL = os.getenv("GEMINI_ROUTER_MODEL", "gemini-2.0-flash")
_ROUTER_TIMEOUT = float(os.getenv("GEMINI_ROUTER_TIMEOUT_SECONDS", "8"))

# ---------------------------------------------------------------------------
# Gemini call (lazy import — avoids crash when not installed)
# ---------------------------------------------------------------------------

def _call_gemini(prompt: str) -> str:
    """
    Call Gemini and return the raw text response.
    Raises on failure — callers must handle.
    """
    try:
        from google import genai
        from google.genai import types
    except ImportError as exc:
        raise RuntimeError("google-genai is not installed") from exc

    api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
    if not api_key:
        raise RuntimeError("GEMINI_API_KEY or GOOGLE_API_KEY is not configured")

    client = genai.Client(api_key=api_key)
    response = client.models.generate_content(
        model=_ROUTER_MODEL,
        config=types.GenerateContentConfig(
            system_instruction=_SYSTEM_INSTRUCTION,
            temperature=0.0,
        ),
        contents=prompt,
    )
    return (response.text or "").strip()


# ---------------------------------------------------------------------------
# Prompt
# ---------------------------------------------------------------------------

_TOOL_LIST = ["search_tours", "get_tour_detail", "fallback_response"]

_SYSTEM_INSTRUCTION = (
    "You are a travel assistant tool selector. "
    "Your ONLY job is to choose the correct tool for a user query. "
    "Do NOT answer the user's question. Do NOT generate tour recommendations. "
    "Do NOT invent information. Tour data must come from search_tours or get_tour_detail tools. "
    "Return ONLY valid JSON matching the schema. No explanation, no markdown, no text outside the JSON."
)

_USER_TEMPLATE = (
    'Choose the correct tool for this query. Return ONLY JSON, no other text.\n\n'
    "Query: {query}\n\n"
    "Available tools: {tools}\n\n"
    "Return this exact JSON shape:\n"
    "{{"
    '  "selected_tool": "<tool>", '
    '"intent": "<find_tour|tour_detail|greeting|out_of_domain|unknown>", '
    '"entities": {{'
    '    "location": "<...>|null", '
    '    "destination_normalized": "<...>|null", '
    '    "date_start": "<YYYY-MM-DD>|null", '
    '    "date_end": "<YYYY-MM-DD>|null", '
    '    "price_min": <number|null>, '
    '    "price_max": <number|null>, '
    '    "people_count": <number|null>, '
    '    "tour_id": "<...>|null"'
    "}}, "
    '"missing_fields": [], '
    '"confidence": <0.0-1.0>'
    "}}\n"
)


def _build_prompt(query: str) -> str:
    return _USER_TEMPLATE.format(
        query=query,
        tools=", ".join(_TOOL_LIST),
    )


# ---------------------------------------------------------------------------
# Validation
# ---------------------------------------------------------------------------

_ALLOWED_TOOLS = set(_TOOL_LIST)
_VALID_INTENTS = {"find_tour", "tour_detail", "greeting", "out_of_domain", "unknown"}


def _parse_and_validate(raw: str) -> Optional[dict]:
    """
    Parse JSON from Gemini output and validate it.

    Returns None if:
    - JSON is invalid
    - selected_tool is not in _ALLOWED_TOOLS
    - confidence is not a number in [0, 1]
    - intent is not in _VALID_INTENTS
    """
    try:
        # Strip markdown code fences: ```json ... ``` or ``` ... ```
        text = raw.strip()
        fence_match = re.match(r"```(\w*)\s*(.*?)\s*```$", text, re.DOTALL)
        if fence_match:
            inner = fence_match.group(2).strip()
        else:
            inner = text
        parsed = json.loads(inner)
    except (json.JSONDecodeError, ValueError, TypeError) as exc:
        logger.warning("Gemini router: JSON parse failed — %s", exc)
        return None

    if not isinstance(parsed, dict):
        return None

    tool = parsed.get("selected_tool")
    if tool not in _ALLOWED_TOOLS:
        logger.warning("Gemini router: unknown tool %r — falling back", tool)
        return None

    confidence = parsed.get("confidence")
    try:
        confidence = float(confidence)
        if not (0.0 <= confidence <= 1.0):
            logger.warning("Gemini router: confidence out of range %s", confidence)
            return None
    except (TypeError, ValueError):
        logger.warning("Gemini router: confidence not numeric %r", confidence)
        return None

    intent = parsed.get("intent")
    if intent not in _VALID_INTENTS:
        logger.warning("Gemini router: unknown intent %r", intent)
        return None

    return parsed


# ---------------------------------------------------------------------------
# Gemini routing function
# ---------------------------------------------------------------------------

def gemini_route(query: str) -> RouteDecision:
    """
    Route a query using Gemini structured JSON output.

    On any failure (JSON parse, unknown tool, API error, timeout),
    falls back to the deterministic router.

    Returns a RouteDecision with route_source="gemini".
    """
    deterministic = DeterministicRouter()

    try:
        prompt = _build_prompt(query)
        raw = _call_gemini(prompt)
    except Exception as exc:
        logger.warning("Gemini router: call failed — %s — falling back to deterministic", exc)
        decision = deterministic.route(query)
        decision.route_source = "deterministic_fallback"
        return decision

    parsed = _parse_and_validate(raw)
    if parsed is None:
        logger.warning("Gemini router: invalid output — falling back to deterministic")
        decision = deterministic.route(query)
        decision.route_source = "deterministic_fallback"
        return decision

    # Build entities dict from parsed output
    raw_entities = parsed.get("entities") or {}
    entities = {}
    for key in (
        "location", "destination_normalized", "date_start", "date_end",
        "price_min", "price_max", "people_count", "tour_id",
    ):
        val = raw_entities.get(key)
        if val is not None and val != "null" and val != "":
            entities[key] = val

    # intent → tool override
    intent = parsed.get("intent", "unknown")
    tool = parsed.get("selected_tool", "fallback_response")

    if intent == "out_of_domain":
        tool = "fallback_response"
    elif intent == "greeting":
        tool = "fallback_response"
    elif intent == "unknown":
        tool = "fallback_response"

    # Validate tool is still registered
    registry = get_registry()
    if registry.get(tool) is None:
        logger.warning("Gemini router: selected tool %r not registered — fallback", tool)
        decision = deterministic.route(query)
        decision.route_source = "deterministic_fallback"
        return decision

    reason = f"gemini:{intent}"

    return RouteDecision(
        tool_name=tool,
        entities=entities,
        reason=reason,
        route_source="gemini",
    )
