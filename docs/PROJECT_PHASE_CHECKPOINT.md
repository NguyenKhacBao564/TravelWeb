# TravelWeb AI Agent Project Checkpoint

> Created: 2026-06-10
> Branch: `plan/travelweb-ai-agent-upgrade`
> Phase: Cleanup (A–E) and AI Agent Phase 0 through 2C complete

---

## 1. Current Status

All cleanup and AI Agent phases through **Phase 2C** are complete and committed.

| Phase | Description | Status |
|-------|-------------|--------|
| Cleanup A | Initial gitignore cleanup | ✅ Complete |
| Cleanup B | Documentation and env normalization | ✅ Complete |
| Cleanup C | Documentation and env normalization (cont.) | ✅ Complete |
| Cleanup D1 | Remove hardcoded config and duplicate routes | ✅ Complete |
| Cleanup E | Import ai-agent service into repo | ✅ Complete |
| Phase 0 | Integration hardening | ✅ Complete |
| Phase 1A | Secure internal tool endpoints | ✅ Complete |
| Phase 1B | Python internal tool client | ✅ Complete |
| Phase 2A | Tool registry and deterministic router | ✅ Complete |
| Phase 2B | Express feature-flag integration | ✅ Complete |
| Phase 2C | Gemini structured tool routing | ✅ Complete |

**Working tree is clean.** Do NOT reset or amend any of the above commits.

---

## 2. Current Architecture

```
React (port 3000)
    │
    ▼
Express (port 3001)  ─── GET /health, GET /ready
    │
    ├─ POST /chat/chatbot
    │       │
    │       ├─ CHAT_AGENT_V2_ENABLED=false (default)
    │       │   └── fetchPythonChatbotResponse → POST {PYTHON_CHATBOT_URL}/chat
    │       │       Legacy pipeline: Gemini → FAISS FAQ → DB search
    │       │       → HTTP 200
    │       │
    │       └─ CHAT_AGENT_V2_ENABLED=true
    │           └── fetchPythonAgentChatV2 → POST {AI_AGENT_CHAT_V2_URL}/agent/chat-v2
    │               │   (Express INTERNAL_SERVICE_TOKEN forwarded)
    │               ▼
    │           Python ai-agent (port 8000)
    │               │
    │               ├─ AgentRequest received
    │               ├─ Router (deterministic | gemini | hybrid — controlled by AGENT_ROUTER_MODE)
    │               │   ├─ DeterministicRouter: keyword/pattern → tool selection
    │               │   ├─ gemini_route(): Gemini structured JSON → tool selection
    │               │   └─ HybridRouter: deterministic for clear cases, Gemini for ambiguous
    │               │
    │               ├─ Orchestrator: executes max 1 tool per request
    │               │
    │               ├─ Tool Registry → tool wrappers
    │               │   ├─ search_tours → Express /internal/tools/search-tours
    │               │   ├─ get_tour_detail → Express /internal/tools/tour/:id
    │               │   └─ fallback_response → deterministic greeting/out-of-domain
    │               │
    │               ▼
    │           AgentResponse (route_source, tool_trace, data)
    │               │
    │               ▼
    │           agentV2ResponseMapper → frontend contract
    │               │
    │               ▼
    │           HTTP 200 (always — errors are stable fallbacks)
    │
    ├─ GET /internal/tools/search-tours  (requires INTERNAL_SERVICE_TOKEN)
    ├─ GET /internal/tools/tour/:id     (requires INTERNAL_SERVICE_TOKEN)
    ├─ GET /chat/logs     (requires auth)
    └─ GET /chat/insights (requires auth)
```

---

## 3. Important Endpoints

### AI Agent (Python, port 8000)

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/health` | Liveness check | None |
| GET | `/ready` | Readiness: FAQ index + API key configured | None |
| POST | `/chat` | Legacy pipeline (Gemini + FAISS) | None |
| POST | `/agent/chat-v2` | New agent: router → tool → trace | None |

### Express Backend (port 3001)

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | `/chat/chatbot` | Main chat endpoint (legacy or agent-v2) | None |
| GET | `/chat/health` | Combined health (Python + Express) | None |
| GET | `/chat/logs` | Recent JSONL log entries | Admin auth |
| GET | `/chat/insights` | Aggregated log analytics | Admin auth |
| GET | `/internal/tools/search-tours` | Agent tool: search tours | `INTERNAL_SERVICE_TOKEN` Bearer |
| GET | `/internal/tools/tour/:tour_id` | Agent tool: tour detail | `INTERNAL_SERVICE_TOKEN` Bearer |

**Feature flag behavior:**
- `CHAT_AGENT_V2_ENABLED=false` (default): `/chat/chatbot` calls legacy `/chat`
- `CHAT_AGENT_V2_ENABLED=true`: `/chat/chatbot` calls `/agent/chat-v2`

---

## 4. Important Env Flags

Set these per-service. Never commit real values.

### Backend (`backend/.env`)

| Flag | Default | Description |
|------|---------|-------------|
| `CHAT_AGENT_V2_ENABLED` | `false` | Route `/chat/chatbot` through agent-v2 |
| `AI_AGENT_CHAT_V2_URL` | `http://localhost:8000/agent/chat-v2` | Agent-v2 endpoint URL |
| `PYTHON_CHATBOT_URL` | `http://localhost:8000/chat` | Legacy Python chatbot URL |
| `PYTHON_CHATBOT_TIMEOUT_MS` | `15000` | Legacy chatbot HTTP timeout |
| `INTERNAL_SERVICE_TOKEN` | _(unset)_ | Bearer token for agent → Express auth |
| `CHAT_ANALYTICS_ENABLED` | `true` | Enable JSONL chat analytics |
| `CHAT_ANALYTICS_LOG_PATH` | `logs/chat_analytics.jsonl` | Analytics log path |

### AI Agent (`services/ai-agent/.env`)

| Flag | Default | Description |
|------|---------|-------------|
| `EXPRESS_API_URL` | `http://localhost:3001` | Express backend base URL |
| `INTERNAL_SERVICE_TOKEN` | _(unset)_ | Must match backend value |
| `INTERNAL_TOOL_TIMEOUT_SECONDS` | `5` | Timeout for Express tool calls |
| `AGENT_ROUTER_MODE` | `deterministic` | `deterministic` \| `gemini` \| `hybrid` |
| `GEMINI_ROUTER_MODEL` | `gemini-2.0-flash` | Model for structured routing decisions |
| `GEMINI_ROUTER_TIMEOUT_SECONDS` | `8` | Timeout for Gemini routing call |
| `GEMINI_API_KEY` | _(unset)_ | Gemini API key (or `GOOGLE_API_KEY`) |
| `GOOGLE_API_KEY` | _(unset)_ | Legacy fallback API key |
| `GEMINI_MODEL` | `gemini-2.0-flash` | Model for legacy `/chat` generation |
| `TOUR_DATA_FILE` | `data/tours_sample.json` | Local tour data fallback |
| `LOG_LEVEL` | `INFO` | Logging level |

---

## 5. Completed Commits

```
e32f263 ai-agent: Phase 2C - add Gemini structured tool routing
0add313 ai-agent: Phase 2B - wire agent v2 through Express feature flag
7043954 ai-agent: Phase 2A - add tool registry and deterministic router
d74dd1c ai-agent: Phase 1B - add Python internal tool client
af8c97c ai-agent: Phase 1A - add secure internal tool endpoints
47c3532 ai-agent: Phase 0 integration hardening
32cb5a3 cleanup: Phase E - import ai-agent service into repo
b03da2d cleanup: Phase D1 - remove hardcoded config and duplicate routes
ddf8b78 cleanup: Phase C - documentation and env normalization
d1f16bd docs: add travelweb ai-agent upgrade
ac889c0 docs: add travelweb ai-agent upgrade and cleanup plans
619abe9 cleanup: gitignore generated artifacts and untrack uploads
5bef6f3 cleanup: verify and fix admin role authorization
6d4cf84 Add AI chatbot integration documentation to README
3c87ceb Handle MSSQL unavailable gracefully in chat tour search
```

---

## 6. Tests and Baseline

Run these before and after any changes:

```bash
# React build
npm run build

# Backend tests (requires backend/.env configured)
cd backend && npm test

# Python agent tests (requires services/ai-agent/.env configured)
cd services/ai-agent && python -m pytest
```

**Latest known passing counts:**

| Suite | Count | Status |
|-------|-------|--------|
| React build | — | ✅ Pass |
| Backend tests (`npm test`) | 66/66 | ✅ Pass |
| Python tests (`pytest`) | 128/128 | ✅ Pass |

**Backend test files:**
- `backend/tests/chatIntegration.test.js` — legacy pipeline tests
- `backend/tests/internalTools.test.js` — internal tool auth tests
- `backend/tests/agentV2Integration.test.js` — agent-v2 feature-flag tests

**Python test files:**
- `tests/test_express_tools_client.py` — Express client + tool wrappers (Phase 1B)
- `tests/test_agent.py` — router, registry, orchestrator, /agent/chat-v2 (Phase 2A)
- `tests/test_gemini_router.py` — Gemini/hybrid routing (Phase 2C)

---

## 7. Non-Negotiable Constraints

These constraints must never be violated in future work:

- **Do not break legacy `/chat/chatbot`**: `CHAT_AGENT_V2_ENABLED=false` must always work
- **Do not replace `/chat/chatbot` without feature flag**: New behavior goes behind a flag
- **Do not expose chain-of-thought**: `tool_trace` and `route_source` only; no raw reasoning
- **Do not log raw secrets**: API keys, tokens, and private user data must never appear in logs
- **Do not query MSSQL directly from Python**: All business data must flow through Express internal tools
- **Use Express internal tools for business data**: `search_tours` and `get_tour_detail` only
- **Keep expected failures as stable HTTP 200**: Never return 502/500 to the frontend
- **Keep changes commit-sized and test-covered**: No large un-reviewed changes
- **Do not add LangChain, LangGraph, CrewAI, or LlamaIndex**
- **Do not implement Docker, Cloud Run, GKE, Terraform, Prometheus, Grafana, or ELK**
- **Do not rebuild FAISS or add new RAG corpus**

---

## 8. Next Recommended Phase

### AI Agent Phase 3A — Lightweight Session Memory

**Goal:** Enable the agent to remember constraints across multi-turn conversations without Redis or a database.

**What to implement:**

1. **`session_id` propagation**
   - Frontend sends `session_id` in POST body to Express
   - Express forwards `session_id` to Python agent via `/agent/chat-v2`
   - Python agent stores/retrieves state in an in-process TTL dict

2. **In-process TTL session store**
   - Simple Python dict with expiry (e.g. `time.time()` + TTL)
   - TTL: 10 minutes of inactivity
   - Stores: last entities, last tool used, conversation summary flag
   - Does NOT store full message history

3. **Merge partial user constraints**
   - If user says "Đà Lạt" in turn 1, then "tháng 7" in turn 2, merge to `{ location: "Đà Lạt", date_start: "2025-07-01" }`
   - Only applies when `session_id` is provided and session is active

**What NOT to implement in Phase 3A:**
- Redis or any external cache
- Database-backed memory (Postgres, MSSQL)
- Full conversation history storage
- Vector embedding of messages
- Streaming responses

**Key files to modify (estimate):**
- `services/ai-agent/agent/schemas.py` — add `session_id` to `AgentRequest`
- `services/ai-agent/server.py` — pass `session_id` through
- `services/ai-agent/agent/session_store.py` — new TTL dict store
- `services/ai-agent/agent/orchestrator.py` — load/save session
- `backend/controller/chatController.js` — forward `session_id`
- `backend/services/agentV2ResponseMapper.js` — pass `session_id` through
- Frontend: add `sessionId` to chat state and POST body
- Tests for session store and multi-turn merging

---

## 9. Manual Smoke Test Commands

### Start all services

```bash
# Terminal 1: AI Agent (Python)
cd services/ai-agent
source .venv/bin/activate
npm run dev:agent
# or: uvicorn server:app --reload --port 8000

# Terminal 2: Express Backend
cd backend
npm run dev
# or: node server.js

# Terminal 3: React Frontend (if testing frontend)
npm run dev
```

### Health checks

```bash
# AI Agent health
curl -s http://localhost:8000/health
# Expected: {"status":"ok"}

# AI Agent readiness (checks FAQ index and API key)
curl -s http://localhost:8000/ready
# Expected: {"status":"ready","faq_index":"ok","api_key":"configured"}

# Express backend health
curl -s http://localhost:3001/chat/health
# Expected: {"status":"ok",...}

# Express health
curl -s http://localhost:3001/health
```

### Legacy chat (default)

```bash
curl -s -X POST http://localhost:3001/chat/chatbot \
  -H "Content-Type: application/json" \
  -d '{"query": "Tìm tour Đà Lạt tháng 7"}'
```

### Agent v2 (requires CHAT_AGENT_V2_ENABLED=true in backend/.env)

```bash
# Direct to Python agent
curl -s -X POST http://localhost:8000/agent/chat-v2 \
  -H "Content-Type: application/json" \
  -d '{"query": "Tìm tour Đà Lạt dưới 5 triệu"}'

# Through Express (with CHAT_AGENT_V2_ENABLED=true)
curl -s -X POST http://localhost:3001/chat/chatbot \
  -H "Content-Type: application/json" \
  -d '{"query": "Tìm tour Đà Lạt dưới 5 triệu"}'
```

### Agent v2 routing modes

```bash
# Deterministic (default)
AGENT_ROUTER_MODE=deterministic curl -s -X POST http://localhost:8000/agent/chat-v2 \
  -H "Content-Type: application/json" \
  -d '{"query": "Xin chào"}'
# Expected: route_source="deterministic", selected_tool="fallback_response"

# Gemini (requires GEMINI_API_KEY)
AGENT_ROUTER_MODE=gemini curl -s -X POST http://localhost:8000/agent/chat-v2 \
  -H "Content-Type: application/json" \
  -d '{"query": "Cho tôi tìm tour Nha Trang tháng 8"}'
# Expected: route_source="gemini", selected_tool="search_tours"
```

### Internal tools (requires INTERNAL_SERVICE_TOKEN)

```bash
# Search tours
curl -s -H "Authorization: Bearer $INTERNAL_SERVICE_TOKEN" \
  "http://localhost:3001/internal/tools/search-tours?location=DaLat&price_max=5000000&limit=3"

# Tour detail
curl -s -H "Authorization: Bearer $INTERNAL_SERVICE_TOKEN" \
  "http://localhost:3001/internal/tools/tour/TOUR001"
```
