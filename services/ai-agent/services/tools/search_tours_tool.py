"""
Tool: search_tours

Wrapper around express_tools_client.search_tours().
Provides a clean tool interface for the ReAct-style agent (Phase 2+).

Not wired into /chat yet.
"""
from typing import Optional

from services.express_tools_client import search_tours as _client_search_tours


def search_tours_tool(
    location: Optional[str] = None,
    destination_normalized: Optional[str] = None,
    date_start: Optional[str] = None,
    date_end: Optional[str] = None,
    price_min: Optional[float] = None,
    price_max: Optional[float] = None,
    people_count: Optional[int] = None,
    limit: int = 5,
    request_id: Optional[str] = None,
    **kwargs,
) -> dict:
    """
    Search for tours using the Express backend's internal tool.

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
        Minimum price in VND.
    price_max : float, optional
        Maximum price in VND.
    people_count : int, optional
        Number of travellers.
    limit : int, default 5
        Max tours to return.
    request_id : str, optional
        Trace ID forwarded to Express.

    Returns
    -------
    dict
        Same shape as express_tools_client.search_tours().
    """
    return _client_search_tours(
        location=location,
        destination_normalized=destination_normalized,
        date_start=date_start,
        date_end=date_end,
        price_min=price_min,
        price_max=price_max,
        people_count=people_count,
        limit=limit,
        request_id=request_id,
    )
