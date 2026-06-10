# AI Agent Smoke Test

Smoke tests for the TravelWeb AI Agent integration. Run these after starting the services locally.

---

## Prerequisites

Ensure the following are set up before running smoke tests:

1. **AI Agent `.env`** — copy and fill in your API key:

   ```bash
   cd services/ai-agent
   cp .env.example .env
   # Add GEMINI_API_KEY (or GOOGLE_API_KEY) to .env
   ```

2. **Backend `.env`** — ensure `PYTHON_CHATBOT_URL` points to the local service:

   ```bash
   # In backend/.env:
   PYTHON_CHATBOT_URL=http://localhost:8000/chat
   ```

---

## Start All Three Services

Open three separate terminal windows:

**Terminal 1 — AI Agent (Python FastAPI):**

```bash
cd services/ai-agent
python -m venv .venv
source .venv/bin/activate       # Windows: .venv\Scripts\activate
pip install -r requirements.txt  # Skip if already installed
uvicorn server:app --host 0.0.0.0 --port 8000 --reload
```

**Terminal 2 — Backend (Express):**

```bash
cd backend
npm install   # Skip if already installed
npm run dev
```

**Terminal 3 — Frontend (React):**

```bash
npm start
```

Or from the root using individual scripts:

```bash
npm run dev:agent   # Terminal 1
npm run dev:backend # Terminal 2
npm run dev:frontend # Terminal 3
```

---

## Smoke Tests

Run each command in a separate terminal or script.

### 1. AI Agent Health Check

```bash
curl -s http://localhost:8000/health
```

**Expected:**

```json
{"status":"ok"}
```

---

### 2. AI Agent Readiness Check

```bash
curl -s http://localhost:8000/ready
```

**Expected (API key configured):**

```json
{"status":"ready","faq_index":"ok","api_key":"configured"}
```

**Expected (API key missing — degraded):**

```json
{"status":"degraded","faq_index":"ok","api_key":"missing"}
```

> **Note:** Without a valid `GEMINI_API_KEY`/`GOOGLE_API_KEY`, `POST /chat` will fall back to deterministic responses. Full AI responses require a valid key.

---

### 3. Express Chat Health Check

```bash
curl -s http://localhost:3001/chat/health
```

**Expected (AI Agent reachable):**

```json
{"status":"ok","service":"travelweb-chat-integration","python_chatbot":{"configured":true,"status":"ok",...}}
```

**Expected (AI Agent down):**

```json
{"status":"degraded","service":"travelweb-chat-integration","python_chatbot":{"configured":true,"status":"unavailable",...}}
```

---

### 4. Chat Bot — Full Query (requires valid GEMINI_API_KEY)

```bash
curl -s -X POST http://localhost:3001/chat/chatbot \
  -H "Content-Type: application/json" \
  -d '{"query": "Tôi muốn tìm tour Đà Lạt tháng 6 ngân sách 5 triệu", "user_id": "smoke_test_user"}'
```

**Expected shape:**

```json
{
  "status": "success",
  "message": "Dạ, em tìm được...",
  "entities": {
    "location": "Đà Lạt",
    "destination_normalized": "da-lat",
    "date_start": "2026-06-01",
    "date_end": "2026-06-30",
    "price_min": 4000000,
    "price_max": 5000000,
    "price_text": "5 triệu"
  },
  "missing_fields": [],
  "tourlist": [...],
  "source": "ai_chatbot"
}
```

Status values: `missing_info`, `partial_search`, `success`, `no_results`, `faq`, `ai_unavailable`.

---

### 5. Chat Bot — Missing Info Query

```bash
curl -s -X POST http://localhost:3001/chat/chatbot \
  -H "Content-Type: application/json" \
  -d '{"query": "Tôi muốn đi Đà Lạt", "user_id": "smoke_test_user"}'
```

**Expected:** `status` is `missing_info` or `partial_search` (location only, missing time/price).

---

### 6. Chat Bot — FAQ Query

```bash
curl -s -X POST http://localhost:3001/chat/chatbot \
  -H "Content-Type: application/json" \
  -d '{"query": "Đà Lạt có gì ngon để ăn không?", "user_id": "smoke_test_user"}'
```

**Expected:** `status` is `faq` or `out_of_scope`.

---

## Known Issues

### POST /chat returns fallback without GEMINI_API_KEY

Without a valid `GEMINI_API_KEY` (or `GOOGLE_API_KEY`) in `services/ai-agent/.env`, the Python chatbot falls back to deterministic hardcoded responses. Chat will still work but natural language quality is reduced.

**Fix:** Add your key to `services/ai-agent/.env`:

```
GEMINI_API_KEY=your_key_here
```

---

### `npm run dev:agent` fails on Windows

The `dev:agent` script uses `cd services/ai-agent && uvicorn ...` which is Unix-shell-specific.

**Fix (Windows):** Run the AI Agent manually:

```powershell
cd services/ai-agent
.\.venv\Scripts\activate
uvicorn server:app --host 0.0.0.0 --port 8000 --reload
```

---

### Backend /chat/insights and /chat/logs return 401

These endpoints are now protected — they require a valid JWT cookie from an Admin account. Use the web UI authenticated as Admin, or pass a valid cookie:

```bash
curl -s http://localhost:3001/chat/insights \
  -H "Cookie: jwt=<your_admin_token>"
```

Non-Admin users get `403 Forbidden`.

---

## Internal Tool Endpoints (for AI Agent)

Internal endpoints at `/internal/tools/` are used by the Python AI Agent for tool-calling. They require `INTERNAL_SERVICE_TOKEN` in `backend/.env`.

### Setup

Add the internal service token to your backend `.env`:

```bash
# backend/.env
INTERNAL_SERVICE_TOKEN=your_secure_token_here
```

### Test Auth Rejection (no token)

```bash
# Returns 401/403 — correct behavior
curl -s http://localhost:3001/internal/tools/search-tours?location=DaLat
curl -s http://localhost:3001/internal/tools/tour/TOUR001
```

### Test search-tours with valid token

```bash
curl -s "http://localhost:3001/internal/tools/search-tours?location=DaLat&price_min=3000000&price_max=6000000" \
  -H "Authorization: Bearer your_secure_token_here"
```

**Expected shape:**

```json
{
  "status": "success",
  "tool": "search_tours",
  "input": { "location": "DaLat", "price_min": 3000000, "price_max": 6000000, "limit": 5 },
  "total": 2,
  "tours": [...],
  "search_metadata": { "has_filters": true, "location": "DaLat", ... }
}
```

### Test get-tour-detail with valid token

```bash
curl -s http://localhost:3001/internal/tools/tour/TOUR001 \
  -H "Authorization: Bearer your_secure_token_here"
```

**Expected shape (tour found):**

```json
{
  "status": "success",
  "tool": "get_tour_detail",
  "tour": { "tour_id": "TOUR001", "name": "...", ... },
  "schedules": [{ "day_number": 1, "description": "...", "meals": "..." }],
  "prices": [{ "age_group": "adultPrice", "price": 4200000 }]
}
```

**Expected shape (not found):**

```json
{
  "status": "not_found",
  "tool": "get_tour_detail",
  "tour": null,
  "schedules": [],
  "prices": []
}
```

---

## Python AI Agent Internal Tool Client Smoke Test

The Python service can call Express internal tools via the `express_tools_client` module.

### Setup

Both services need the same `INTERNAL_SERVICE_TOKEN`:

```bash
# backend/.env
INTERNAL_SERVICE_TOKEN=your_secure_token_here
PYTHON_CHATBOT_URL=http://localhost:8000/chat
```

```bash
# services/ai-agent/.env
EXPRESS_API_URL=http://localhost:3001
INTERNAL_SERVICE_TOKEN=your_secure_token_here
INTERNAL_TOOL_TIMEOUT_SECONDS=5
```

### Start services

```bash
# Terminal 1: AI Agent
npm run dev:agent

# Terminal 2: Backend
npm run dev:backend
```

### Manual Python client test

Once both services are running, verify the Python client can call Express tools:

```python
# services/ai-agent/ directory
# Requires httpx installed: pip install httpx

import os
os.environ["EXPRESS_API_URL"] = "http://localhost:3001"
os.environ["INTERNAL_SERVICE_TOKEN"] = "your_secure_token_here"

from services.express_tools_client import search_tours, get_tour_detail

# Test search_tours
result = search_tours(location="DaLat", price_max=6000000, limit=3)
print(result["ok"], result["status"], result["data"]["total"] if result["ok"] else result["error_type"])

# Test get_tour_detail
result = get_tour_detail("TOUR001")
print(result["ok"], result["status"], result["data"]["tour"] if result["ok"] and result["data"]["tour"] else result["error_type"])
```

Or with a one-liner curl equivalent (requires httpx installed in the Python environment):

```bash
cd services/ai-agent
source .venv/bin/activate
python -c "
import os
os.environ['EXPRESS_API_URL']='http://localhost:3001'
os.environ['INTERNAL_SERVICE_TOKEN']='your_secure_token_here'
from services.express_tools_client import search_tours
import json; print(json.dumps(search_tours(location='DaLat'), indent=2, ensure_ascii=False))
"
```

Expected: `{"ok": true, "status": "success", "tool": "search_tours", ...}`.

If `ok: false` and `error_type: missing_config`, the token is not set. If `auth_error`, tokens don't match between services.

---

## POST /agent/chat-v2 (Phase 2A — Experimental)

A deterministic tool-routing agent that runs **in parallel with** `POST /chat` and does not replace it. Uses rule-based routing to select `search_tours`, `get_tour_detail`, or `fallback_response`, and returns a structured response with `tool_trace`.

### Prerequisites

Both services need matching `INTERNAL_SERVICE_TOKEN`:

```bash
# backend/.env
INTERNAL_SERVICE_TOKEN=your_secure_token_here
PYTHON_CHATBOT_URL=http://localhost:8000/chat
```

```bash
# services/ai-agent/.env
EXPRESS_API_URL=http://localhost:3001
INTERNAL_SERVICE_TOKEN=your_secure_token_here
INTERNAL_TOOL_TIMEOUT_SECONDS=5
```

### Smoke test

```bash
# AI Agent must be running (Terminal 1)
npm run dev:agent

# Backend must be running (Terminal 2)
npm run dev:backend

# curl /agent/chat-v2
curl -s -X POST http://localhost:8000/agent/chat-v2 \
  -H "Content-Type: application/json" \
  -d '{"query": "Tôi muốn tìm tour Đà Lạt dưới 5 triệu"}'
```

**Expected response shape:**

```json
{
  "status": "success",
  "message": "Em hiểu bạn muốn tìm tour địa điểm Đà Lạt ngân sách 5.000.000đ...",
  "selected_tool": "search_tours",
  "entities": {
    "location": "Đà Lạt",
    "price_max": 5000000
  },
  "tool_trace": [
    {
      "step": 1,
      "selected_tool": "search_tours",
      "tool_status": "success",
      "latency_ms": 123.4,
      "error_type": null,
      "result_summary": "search_tours returned 2 tour(s)"
    }
  ],
  "data": { ... }
}
```

### Routing rules

| Query pattern | Tool selected |
|---------------|-------------|
| Greeting ("xin chào", "chào bạn", "hello") | `fallback_response` |
| Out-of-domain keywords | `fallback_response` |
| Tour ID pattern (`TOUR001`, `tour_id: XYZ`) | `get_tour_detail` |
| Tour search keywords ("tìm tour", "đặt tour", "tour nào") | `search_tours` |
| Location/price/time entities found | `search_tours` |
| Nothing matched | `fallback_response` |

### Notes

- `POST /chat` is **unchanged** and remains the primary chat endpoint.
- `/agent/chat-v2` is experimental and additive.
- Tool execution is limited to one tool per request in Phase 2A.
- Gemini is not called during routing — routing is deterministic rule-based.

---

## Enable Agent V2 through Express Backend (Phase 2B)

When `CHAT_AGENT_V2_ENABLED=true`, Express `POST /chat/chatbot` routes through the Python agent's `/agent/chat-v2` endpoint instead of the legacy `/chat`. The legacy path remains available and unchanged.

**This is a feature-flag. Default is `false` — the existing `/chat/chatbot` behavior is unchanged.**

### Setup

```bash
# backend/.env — enable agent v2 routing
CHAT_AGENT_V2_ENABLED=true
AI_AGENT_CHAT_V2_URL=http://localhost:8000/agent/chat-v2

# services/ai-agent/.env
EXPRESS_API_URL=http://localhost:3001
INTERNAL_SERVICE_TOKEN=your_secure_token_here
INTERNAL_TOOL_TIMEOUT_SECONDS=5
```

### Smoke test

Both services must be running:

```bash
# Terminal 1: AI Agent
npm run dev:agent

# Terminal 2: Backend
npm run dev:backend

# curl through Express — uses agent v2 when CHAT_AGENT_V2_ENABLED=true
curl -s -X POST http://localhost:3001/chat/chatbot \
  -H "Content-Type: application/json" \
  -d '{"query": "Tìm tour Đà Lạt dưới 5 triệu"}'
```

**Expected response shape (when agent v2 is enabled):**

```json
{
  "status": "success",
  "message": "...",
  "response": "...",
  "entities": { "location": "Đà Lạt", "price_max": 5000000 },
  "missing_fields": [],
  "tourlist": [...],
  "faq_sources": [],
  "search_metadata": {
    "selected_tool": "search_tours",
    "total": 2,
    "has_filters": true
  },
  "tool_trace": [
    {
      "step": 1,
      "selected_tool": "search_tours",
      "tool_status": "success",
      "latency_ms": 123.4,
      "error_type": null,
      "result_summary": "search_tours returned 2 tour(s)"
    }
  ],
  "fallback_used": false
}
```

### Notes

- `POST /chat/chatbot` remains the **unchanged default** when `CHAT_AGENT_V2_ENABLED=false`.
- Agent v2 errors (timeout, connection refused, auth failure) return HTTP 200 with `status: ai_unavailable` — the frontend never sees a 502.
- The `tool_trace` field exposes only structured execution metadata, not chain-of-thought.
- If `CHAT_AGENT_V2_ENABLED=true` is set, `PYTHON_CHATBOT_URL` (legacy) is not called.

---

## Phase 2C: Gemini Structured Routing

Three router modes are available via `AGENT_ROUTER_MODE`:

| Mode | Description |
|------|-------------|
| `deterministic` (default) | Rule-based keyword/pattern matching. No API key needed. |
| `gemini` | Gemini structured JSON for all queries. Falls back to deterministic on error. |
| `hybrid` | Deterministic for clear cases (greeting, tour_id, out-of-domain); Gemini for ambiguous travel queries. |

### Environment setup

```bash
# services/ai-agent/.env
# Router mode (deterministic | gemini | hybrid)
AGENT_ROUTER_MODE=deterministic

# Gemini routing only (requires GEMINI_API_KEY or GOOGLE_API_KEY):
GEMINI_ROUTER_MODEL=gemini-2.0-flash
GEMINI_ROUTER_TIMEOUT_SECONDS=8

# Express must be configured:
EXPRESS_API_URL=http://localhost:3001
INTERNAL_SERVICE_TOKEN=your_secure_token_here
```

### Smoke test — deterministic mode (default)

```bash
curl -s -X POST http://localhost:8000/agent/chat-v2 \
  -H "Content-Type: application/json" \
  -d '{"query": "Tìm tour Đà Lạt dưới 5 triệu"}'
```

Expected `route_source: "deterministic"` in response.

### Smoke test — gemini mode

```bash
# Requires GEMINI_API_KEY in services/ai-agent/.env
curl -s -X POST http://localhost:8000/agent/chat-v2 \
  -H "Content-Type: application/json" \
  -d '{"query": "Cho tôi tìm tour Nha Trang tháng 8"}'
```

Expected `route_source: "gemini"` in response on success, or `route_source: "deterministic_fallback"` on Gemini failure.

### Expected response (with route_source)

```json
{
  "status": "success",
  "message": "...",
  "selected_tool": "search_tours",
  "entities": { "location": "Đà Lạt", "price_max": 5000000 },
  "tool_trace": [...],
  "route_source": "gemini",
  "data": {...}
}
```

### Fallback behavior

- `gemini` mode: JSON parse error, unknown tool, timeout, or API error → `route_source: "deterministic_fallback"` (deterministic router handles it)
- `hybrid` mode: same as gemini
- No chain-of-thought is ever exposed in `route_source`, `tool_trace`, or any response field.

---

## Phase 3A: Session Memory

Multi-turn context accumulation for travel queries. Session memory is **in-process** (no Redis, no database). All memory is TTL-based and capped per session.

### Environment setup

```bash
# services/ai-agent/.env — add these to existing config
# Session TTL in seconds (default 24h)
SESSION_TTL_SECONDS=86400

# Max recent turns per session (default 10)
SESSION_MAX_TURNS=10

# Debug: store raw query length in turn metadata (default false)
DEBUG_MEMORY_STORE_TEXT=false
```

### Smoke test — multi-turn sequence

Start the services first, then run the following curl sequence in two separate terminals or sequentially with the session ID:

**Turn 1 — destination only:**

```bash
curl -s -X POST http://localhost:8000/agent/chat-v2 \
  -H "Content-Type: application/json" \
  -d '{"query": "Tôi muốn đi Đà Lạt"}'
```

Expected response:
```json
{
  "status": "success",
  "selected_tool": "search_tours",
  "entities": { "location": "Đà Lạt" },
  "session_id": "<uuid>",
  "memory_used": false,
  "route_source": "deterministic",
  ...
}
```

Copy the `session_id` from the response.

**Turn 2 — same session, adds price + people:**

```bash
curl -s -X POST http://localhost:8000/agent/chat-v2 \
  -H "Content-Type: application/json" \
  -d '{"query": "Dưới 5 triệu, đi 2 người", "session_id": "<uuid-from-turn-1>"}'
```

Expected response:
```json
{
  "status": "success",
  "selected_tool": "search_tours",
  "entities": { "location": "Đà Lạt", "price_max": 5000000, "people_count": 2 },
  "session_id": "<same-uuid>",
  "memory_used": true,
  "route_source": "deterministic",
  ...
}
```

Key assertions:
- `session_id` is the same as turn 1
- `memory_used: true`
- `entities` includes `location` (from turn 1 memory) and `price_max` + `people_count` (from current query)

### Smoke test — follow-up refinement

**Turn 1:**

```bash
curl -s -X POST http://localhost:8000/agent/chat-v2 \
  -H "Content-Type: application/json" \
  -d '{"query": "Tìm tour Đà Lạt"}'
```

**Turn 2 — "còn tour nào nữa không":**

```bash
curl -s -X POST http://localhost:8000/agent/chat-v2 \
  -H "Content-Type: application/json" \
  -d '{"query": "Còn tour nào nữa không", "session_id": "<uuid>"}'
```

Expected: `selected_tool: "search_tours"`, `memory_used: true`, `reason: "memory_followup"` (internal field).

### Smoke test — reset session

```bash
curl -s -X POST http://localhost:8000/agent/chat-v2 \
  -H "Content-Type: application/json" \
  -d '{"query": "Xóa cuộc trò chuyện", "session_id": "<uuid>", "reset_session": true}'
```

Expected: new `session_id` in response, `memory_used: false`.

### Safety notes

- No raw query text is stored by default. Only `content_len` (length) is stored per turn.
- Session TTL is 24h of inactivity. Sessions auto-expire.
- Chain-of-thought is never stored or exposed.
- `memory_used: false` means no prior context was available — not an error.

---

## Test Results Summary

| Test | Command | Pass Criterion |
|------|---------|----------------|
| AI Agent health | `curl localhost:8000/health` | `{"status":"ok"}` |
| AI Agent ready | `curl localhost:8000/ready` | JSON with `status` field |
| Express chat health | `curl localhost:3001/chat/health` | `ok` or `degraded` |
| Chat — tour query | `POST /chat/chatbot` | Valid JSON, status in expected set |
| Chat — missing info | `POST /chat/chatbot` | `missing_info` or `partial_search` |
| Chat — FAQ | `POST /chat/chatbot` | `faq` or `out_of_scope` |
| Chat logs (Admin) | `GET /chat/logs` with auth | 200 with logs array |
| Chat insights (Admin) | `GET /chat/insights` with auth | 200 with aggregates |
