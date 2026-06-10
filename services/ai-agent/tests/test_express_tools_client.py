"""
Tests for services/express_tools_client.py

Tests the public functions (search_tours, get_tour_detail) by mocking the
internal _call helper. This avoids all import/caching issues with patching
httpx at the module level.

Requires pytest.
"""
from unittest.mock import MagicMock, patch

import pytest


# ---------------------------------------------------------------------------
# Helper
# ---------------------------------------------------------------------------

def _mock_result(ok, status, tool, data=None, error_type=None, latency_ms=10.0):
    return {
        "ok": ok,
        "status": status,
        "tool": tool,
        "data": data,
        "error_type": error_type,
        "latency_ms": latency_ms,
    }


# ---------------------------------------------------------------------------
# search_tours tests
# ---------------------------------------------------------------------------

class TestSearchTours:
    def test_sends_correct_params_to_call(self):
        """search_tours passes all provided params to _call."""
        with patch("services.express_tools_client._call") as mock_call:
            mock_call.return_value = _mock_result(
                ok=True, status="success", tool="search_tours",
                data={"total": 2, "tours": [], "search_metadata": {}}
            )
            from services.express_tools_client import search_tours
            result = search_tours(
                location="Đà Lạt",
                destination_normalized="da-lat",
                date_start="2025-07-01",
                date_end="2025-07-05",
                price_min=3000000,
                price_max=5000000,
                people_count=4,
                limit=3,
                request_id="req-abc-123",
            )

        mock_call.assert_called_once_with(
            "GET",
            "/internal/tools/search-tours",
            params={
                "limit": 3,
                "location": "Đà Lạt",
                "destination_normalized": "da-lat",
                "date_start": "2025-07-01",
                "date_end": "2025-07-05",
                "price_min": 3000000,
                "price_max": 5000000,
                "people_count": 4,
            },
            request_id="req-abc-123",
        )
        assert result["ok"] is True
        assert result["tool"] == "search_tours"
        assert result["data"]["total"] == 2

    def test_normalises_tool_name_to_search_tours(self):
        """search_tours ensures tool name is 'search_tours' even when _call returns <unknown>."""
        with patch("services.express_tools_client._call") as mock_call:
            mock_call.return_value = _mock_result(
                ok=True, status="success", tool="<unknown>",
                data={"total": 0, "tours": [], "search_metadata": {}}
            )
            from services.express_tools_client import search_tours
            result = search_tours(location="Hà Nội")

        assert result["tool"] == "search_tours"

    def test_missing_token_returns_missing_config(self):
        """search_tours propagates missing_config from _call."""
        with patch("services.express_tools_client._call") as mock_call:
            mock_call.return_value = _mock_result(
                ok=False, status="INTERNAL_SERVICE_TOKEN is not set",
                tool="search_tours", error_type="missing_config"
            )
            from services.express_tools_client import search_tours
            result = search_tours(location="Đà Lạt")

        assert result["ok"] is False
        assert result["error_type"] == "missing_config"
        assert result["tool"] == "search_tours"

    def test_timeout_returns_timeout_error(self):
        """search_tours propagates timeout from _call."""
        with patch("services.express_tools_client._call") as mock_call:
            mock_call.return_value = _mock_result(
                ok=False, status="request timed out after 5s",
                tool="search_tours", error_type="timeout"
            )
            from services.express_tools_client import search_tours
            result = search_tours(location="Nha Trang")

        assert result["ok"] is False
        assert result["error_type"] == "timeout"

    def test_auth_error_propagates(self):
        """search_tours propagates auth_error from _call."""
        with patch("services.express_tools_client._call") as mock_call:
            mock_call.return_value = _mock_result(
                ok=False, status="HTTP 401",
                tool="search_tours", error_type="auth_error"
            )
            from services.express_tools_client import search_tours
            result = search_tours(location="Phú Quốc")

        assert result["ok"] is False
        assert result["error_type"] == "auth_error"

    def test_server_error_propagates(self):
        """search_tours propagates server_error from _call."""
        with patch("services.express_tools_client._call") as mock_call:
            mock_call.return_value = _mock_result(
                ok=False, status="HTTP 500",
                tool="search_tours", error_type="server_error"
            )
            from services.express_tools_client import search_tours
            result = search_tours(location="Huế")

        assert result["ok"] is False
        assert result["error_type"] == "server_error"

    def test_bad_response_propagates(self):
        """search_tours propagates bad_response from _call."""
        with patch("services.express_tools_client._call") as mock_call:
            mock_call.return_value = _mock_result(
                ok=False, status="HTTP 200",
                tool="search_tours", error_type="bad_response"
            )
            from services.express_tools_client import search_tours
            result = search_tours(location="Sa Pa")

        assert result["ok"] is False
        assert result["error_type"] == "bad_response"

    def test_omits_none_params(self):
        """search_tours only includes params that are not None."""
        with patch("services.express_tools_client._call") as mock_call:
            mock_call.return_value = _mock_result(
                ok=True, status="success", tool="search_tours",
                data={"total": 0, "tours": [], "search_metadata": {}}
            )
            from services.express_tools_client import search_tours
            search_tours(location="Đà Lạt")

        call_params = mock_call.call_args[1]["params"]
        assert "location" in call_params
        assert "date_start" not in call_params
        assert "price_min" not in call_params

    def test_request_id_forwarded(self):
        """search_tours forwards X-Request-ID via _call."""
        with patch("services.express_tools_client._call") as mock_call:
            mock_call.return_value = _mock_result(
                ok=True, status="success", tool="search_tours",
                data={"total": 0, "tours": [], "search_metadata": {}}
            )
            from services.express_tools_client import search_tours
            search_tours(location="Hà Nội", request_id="trace-xyz-789")

        assert mock_call.call_args[1]["request_id"] == "trace-xyz-789"


# ---------------------------------------------------------------------------
# get_tour_detail tests
# ---------------------------------------------------------------------------

class TestGetTourDetail:
    def test_sends_tour_id_to_call(self):
        """get_tour_detail passes tour_id in the URL path to _call."""
        with patch("services.express_tools_client._call") as mock_call:
            mock_call.return_value = _mock_result(
                ok=True, status="success", tool="get_tour_detail",
                data={"tour": {"tour_id": "TOUR001"}, "schedules": [], "prices": []}
            )
            from services.express_tools_client import get_tour_detail
            result = get_tour_detail("TOUR001", request_id="req-abc")

        mock_call.assert_called_once_with(
            "GET",
            "/internal/tools/tour/TOUR001",
            request_id="req-abc",
        )
        assert result["ok"] is True
        assert result["tool"] == "get_tour_detail"
        assert result["data"]["tour"]["tour_id"] == "TOUR001"

    def test_normalises_tool_name_to_get_tour_detail(self):
        """get_tour_detail ensures tool name is 'get_tour_detail' even when _call returns <unknown>."""
        with patch("services.express_tools_client._call") as mock_call:
            mock_call.return_value = _mock_result(
                ok=True, status="success", tool="<unknown>",
                data={"tour": None, "schedules": [], "prices": []}
            )
            from services.express_tools_client import get_tour_detail
            result = get_tour_detail("TOUR999")

        assert result["tool"] == "get_tour_detail"

    def test_missing_token_returns_missing_config(self):
        """get_tour_detail propagates missing_config from _call."""
        with patch("services.express_tools_client._call") as mock_call:
            mock_call.return_value = _mock_result(
                ok=False, status="INTERNAL_SERVICE_TOKEN is not set",
                tool="get_tour_detail", error_type="missing_config"
            )
            from services.express_tools_client import get_tour_detail
            result = get_tour_detail("TOUR001")

        assert result["ok"] is False
        assert result["error_type"] == "missing_config"

    def test_timeout_returns_timeout_error(self):
        """get_tour_detail propagates timeout from _call."""
        with patch("services.express_tools_client._call") as mock_call:
            mock_call.return_value = _mock_result(
                ok=False, status="request timed out after 5s",
                tool="get_tour_detail", error_type="timeout"
            )
            from services.express_tools_client import get_tour_detail
            result = get_tour_detail("TOUR001")

        assert result["ok"] is False
        assert result["error_type"] == "timeout"

    def test_auth_error_propagates(self):
        """get_tour_detail propagates auth_error from _call."""
        with patch("services.express_tools_client._call") as mock_call:
            mock_call.return_value = _mock_result(
                ok=False, status="HTTP 403",
                tool="get_tour_detail", error_type="auth_error"
            )
            from services.express_tools_client import get_tour_detail
            result = get_tour_detail("TOUR001")

        assert result["ok"] is False
        assert result["error_type"] == "auth_error"

    def test_not_found_returns_ok_true(self):
        """get_tour_detail returns ok=True when Express returns status=not_found."""
        with patch("services.express_tools_client._call") as mock_call:
            mock_call.return_value = _mock_result(
                ok=True, status="not_found", tool="get_tour_detail",
                data={"tour": None, "schedules": [], "prices": []}
            )
            from services.express_tools_client import get_tour_detail
            result = get_tour_detail("TOUR_NOT_EXIST")

        assert result["ok"] is True
        assert result["status"] == "not_found"
        assert result["data"]["tour"] is None

    def test_server_error_propagates(self):
        """get_tour_detail propagates server_error from _call."""
        with patch("services.express_tools_client._call") as mock_call:
            mock_call.return_value = _mock_result(
                ok=False, status="HTTP 500",
                tool="get_tour_detail", error_type="server_error"
            )
            from services.express_tools_client import get_tour_detail
            result = get_tour_detail("TOUR001")

        assert result["ok"] is False
        assert result["error_type"] == "server_error"

    def test_request_id_forwarded(self):
        """get_tour_detail forwards X-Request-ID via _call."""
        with patch("services.express_tools_client._call") as mock_call:
            mock_call.return_value = _mock_result(
                ok=True, status="success", tool="get_tour_detail",
                data={"tour": {}, "schedules": [], "prices": []}
            )
            from services.express_tools_client import get_tour_detail
            get_tour_detail("TOUR001", request_id="trace-abc")

        assert mock_call.call_args[1]["request_id"] == "trace-abc"


# ---------------------------------------------------------------------------
# _call unit tests (integration-style, mocking httpx at the socket level)
# ---------------------------------------------------------------------------

class TestCall:
    def test_401_returns_auth_error(self):
        """_call returns auth_error for HTTP 401."""
        with patch("services.express_tools_client._get_token", return_value="token"), \
             patch("services.express_tools_client._get_base_url", return_value="http://localhost:3001"), \
             patch("services.express_tools_client._get_timeout", return_value=5.0), \
             patch("services.express_tools_client.httpx") as mock_httpx:

            mock_resp = MagicMock()
            mock_resp.status_code = 401
            mock_client = MagicMock()
            mock_client.request.return_value = mock_resp
            mock_httpx.Client.return_value.__enter__ = MagicMock(return_value=mock_client)
            mock_httpx.Client.return_value.__exit__ = MagicMock(return_value=False)
            mock_httpx.Timeout = MagicMock
            mock_httpx.ConnectError = MagicMock

            from services.express_tools_client import _call
            result = _call("GET", "/internal/tools/search-tours")

        assert result["ok"] is False
        assert result["error_type"] == "auth_error"
        assert result["status"] == "HTTP 401"

    def test_500_returns_server_error(self):
        """_call returns server_error for HTTP 500."""
        with patch("services.express_tools_client._get_token", return_value="token"), \
             patch("services.express_tools_client._get_base_url", return_value="http://localhost:3001"), \
             patch("services.express_tools_client._get_timeout", return_value=5.0), \
             patch("services.express_tools_client.httpx") as mock_httpx:

            mock_resp = MagicMock()
            mock_resp.status_code = 500
            mock_client = MagicMock()
            mock_client.request.return_value = mock_resp
            mock_httpx.Client.return_value.__enter__ = MagicMock(return_value=mock_client)
            mock_httpx.Client.return_value.__exit__ = MagicMock(return_value=False)
            mock_httpx.Timeout = MagicMock
            mock_httpx.ConnectError = MagicMock

            from services.express_tools_client import _call
            result = _call("GET", "/internal/tools/search-tours")

        assert result["ok"] is False
        assert result["error_type"] == "server_error"
