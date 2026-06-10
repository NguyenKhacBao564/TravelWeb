"""
Express Internal Tools Client

Calls the Express backend's /internal/tools endpoints using the
INTERNAL_SERVICE_TOKEN Bearer auth. All expected failures return
ok=False instead of raising exceptions, so callers can handle
degraded mode gracefully.
"""
import logging
import os
import time
from typing import Any, Literal, Optional

try:
    import httpx
except ImportError:
    httpx = None

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Config helpers
# ---------------------------------------------------------------------------

def _get_base_url() -> str:
    return os.getenv("EXPRESS_API_URL", "http://localhost:3001").rstrip("/")


def _get_token() -> Optional[str]:
    return os.getenv("INTERNAL_SERVICE_TOKEN") or None


def _get_timeout() -> float:
    try:
        return float(os.getenv("INTERNAL_TOOL_TIMEOUT_SECONDS", "5"))
    except (ValueError, TypeError):
        return 5.0


# ---------------------------------------------------------------------------
# Low-level call helper
# ---------------------------------------------------------------------------

def _call(
    method: Literal["GET"],
    path: str,
    params: Optional[dict[str, Any]] = None,
    request_id: Optional[str] = None,
) -> dict[str, Any]:
    """
    Make an HTTP call to an Express internal tool endpoint.

    Returns a normalised result dict::

        {
            "ok": True/False,
            "status": "...",       # from the Express endpoint, or error reason
            "tool": "...",
            "data": ...,           # parsed body, or None on error
            "error_type": None
                               | "missing_config"
                               | "timeout"
                               | "connection_error"
                               | "auth_error"
                               | "bad_response"
                               | "server_error",
            "latency_ms": ...,
        }

    Exceptions are never raised to callers.
    """
    if httpx is None:
        return _error_result(
            tool="<unknown>",
            error_type="missing_config",
            status="httpx is not installed",
            latency_ms=0,
        )

    token = _get_token()
    if not token:
        return _error_result(
            tool="<unknown>",
            error_type="missing_config",
            status="INTERNAL_SERVICE_TOKEN is not set",
            latency_ms=0,
        )

    base = _get_base_url()
    url = f"{base}{path}"
    timeout = _get_timeout()

    headers = {"Authorization": f"Bearer {token}"}
    if request_id:
        headers["X-Request-ID"] = request_id

    start = time.monotonic()
    try:
        with httpx.Client(timeout=httpx.Timeout(timeout)) as client:
            response = client.request(method, url, params=params, headers=headers)
    except httpx.Timeout:
        return _error_result(
            tool="<unknown>",
            error_type="timeout",
            status=f"request timed out after {timeout}s",
            latency_ms=_elapsed_ms(start),
        )
    except httpx.ConnectError:
        return _error_result(
            tool="<unknown>",
            error_type="connection_error",
            status="could not connect to Express backend",
            latency_ms=_elapsed_ms(start),
        )
    except Exception as exc:
        logger.warning("Unexpected error calling %s: %s", url, exc)
        return _error_result(
            tool="<unknown>",
            error_type="connection_error",
            status=str(exc),
            latency_ms=_elapsed_ms(start),
        )

    latency_ms = _elapsed_ms(start)

    if response.status_code in (401, 403):
        return {
            "ok": False,
            "status": f"HTTP {response.status_code}",
            "tool": "<unknown>",
            "data": None,
            "error_type": "auth_error",
            "latency_ms": latency_ms,
        }

    if response.status_code >= 500:
        return {
            "ok": False,
            "status": f"HTTP {response.status_code}",
            "tool": "<unknown>",
            "data": None,
            "error_type": "server_error",
            "latency_ms": latency_ms,
        }

    try:
        data = response.json()
    except Exception:
        return {
            "ok": False,
            "status": f"HTTP {response.status_code}",
            "tool": "<unknown>",
            "data": None,
            "error_type": "bad_response",
            "latency_ms": latency_ms,
        }

    return {
        "ok": True,
        "status": str(data.get("status", "")),
        "tool": data.get("tool", "<unknown>"),
        "data": data,
        "error_type": None,
        "latency_ms": latency_ms,
    }


def _error_result(
    tool: str,
    error_type: str,
    status: str,
    latency_ms: float,
) -> dict[str, Any]:
    return {
        "ok": False,
        "status": status,
        "tool": tool,
        "data": None,
        "error_type": error_type,
        "latency_ms": latency_ms,
    }


def _elapsed_ms(start: float) -> float:
    return round((time.monotonic() - start) * 1000, 1)


# ---------------------------------------------------------------------------
# Public tool functions
# ---------------------------------------------------------------------------

def search_tours(
    location: Optional[str] = None,
    destination_normalized: Optional[str] = None,
    date_start: Optional[str] = None,
    date_end: Optional[str] = None,
    price_min: Optional[float] = None,
    price_max: Optional[float] = None,
    people_count: Optional[int] = None,
    limit: int = 5,
    request_id: Optional[str] = None,
) -> dict[str, Any]:
    """
    Call GET /internal/tools/search-tours on the Express backend.

    Parameters
    ----------
    location : str, optional
        Destination name (e.g. "Đà Lạt").
    destination_normalized : str, optional
        Destination slug (e.g. "da-lat").
    date_start : str, optional
        ISO date YYYY-MM-DD.
    date_end : str, optional
        ISO date YYYY-MM-DD.
    price_min : float, optional
        Minimum tour price in VND.
    price_max : float, optional
        Maximum tour price in VND.
    people_count : int, optional
        Number of travellers (informational only).
    limit : int, default 5
        Max tours to return (server caps at 20).
    request_id : str, optional
        X-Request-ID to forward for tracing.

    Returns
    -------
    dict
        Normalised result::

            {
                "ok": True/False,
                "status": "success|no_results|error",
                "tool": "search_tours",
                "data": { "total": ..., "tours": [...], "search_metadata": {...} },
                "error_type": None | "missing_config" | "timeout" | ...,
                "latency_ms": ...,
            }
    """
    params: dict[str, Any] = {"limit": limit}
    if location:
        params["location"] = location
    if destination_normalized:
        params["destination_normalized"] = destination_normalized
    if date_start:
        params["date_start"] = date_start
    if date_end:
        params["date_end"] = date_end
    if price_min is not None:
        params["price_min"] = price_min
    if price_max is not None:
        params["price_max"] = price_max
    if people_count is not None:
        params["people_count"] = people_count

    result = _call("GET", "/internal/tools/search-tours", params=params, request_id=request_id)
    # Normalise tool name on success
    if result.get("ok") and result.get("tool") == "<unknown>":
        result["tool"] = "search_tours"
    return result


def get_tour_detail(
    tour_id: str,
    request_id: Optional[str] = None,
) -> dict[str, Any]:
    """
    Call GET /internal/tools/tour/:tour_id on the Express backend.

    Parameters
    ----------
    tour_id : str
        The tour identifier.
    request_id : str, optional
        X-Request-ID to forward for tracing.

    Returns
    -------
    dict
        Normalised result::

            {
                "ok": True/False,
                "status": "success|not_found|error",
                "tool": "get_tour_detail",
                "data": {
                    "tour": {...},
                    "schedules": [...],
                    "prices": [...],
                },
                "error_type": None | "missing_config" | "timeout" | ...,
                "latency_ms": ...,
            }
    """
    result = _call(
        "GET",
        f"/internal/tools/tour/{tour_id}",
        request_id=request_id,
    )
    # Normalise tool name on success
    if result.get("ok") and result.get("tool") == "<unknown>":
        result["tool"] = "get_tour_detail"
    return result
