"""
Tool: get_tour_detail

Wrapper around express_tools_client.get_tour_detail().
Provides a clean tool interface for the ReAct-style agent (Phase 2+).

Not wired into /chat yet.
"""
from typing import Optional

from services.express_tools_client import get_tour_detail as _client_get_tour_detail


def get_tour_detail_tool(
    tour_id: str,
    request_id: Optional[str] = None,
) -> dict:
    """
    Retrieve detailed information about a specific tour.

    Parameters
    ----------
    tour_id : str
        The tour identifier.
    request_id : str, optional
        Trace ID forwarded to Express.

    Returns
    -------
    dict
        Same shape as express_tools_client.get_tour_detail().
    """
    return _client_get_tour_detail(
        tour_id=tour_id,
        request_id=request_id,
    )
