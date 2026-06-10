# TravelWeb AI Agent Project Checkpoint

> Updated: 2026-06-10
> Branch: `plan/travelweb-ai-agent-upgrade`
> Phase: Cleanup (A–E) and AI Agent Phase 0 through **4B** complete

---

## 1. Current Status

| Phase | Description | Status |
|-------|-------------|--------|
| Cleanup A–E | Git hygiene, import ai-agent | ✅ Complete |
| Phase 0 | Integration hardening | ✅ Complete |
| Phase 1A | Secure internal tool endpoints | ✅ Complete |
| Phase 1B | Python internal tool client | ✅ Complete |
| Phase 2A | Tool registry + deterministic router | ✅ Complete |
| Phase 2B | Express feature-flag integration | ✅ Complete |
| Phase 2C | Gemini structured tool routing | ✅ Complete |
| Phase 3A | Lightweight session memory | ✅ Complete |
| Phase 3B | Admin AI Insights Agent V2 metrics | ✅ Complete |
| **Phase 4A** | **FAQ + booking policy retrieval tools** | ✅ **Complete** |
| **Phase 4B** | **Demo polish, README, CV docs, review handoff** | ✅ **Complete** |

**Phase 4B deliverables:**
- `README.md` — AI Agent positioning, architecture diagram, local demo quickstart
- `docs/CV_PROJECT_BULLETS.md` — NLP/AI Agent and DevOps CV versions
- `docs/SCREENSHOT_CHECKLIST.md` — portfolio screenshot/video checklist
- `docs/CODEX_REVIEW_HANDOFF.md` — reviewer/agent handoff
- `docs/SMOKE_TEST_AI_AGENT.md` — Full Demo Path section
- `package.json` — `test:backend`, `test:agent`, `test:all` scripts

---

## 2. Current Architecture

```
React (port 3000)
    ▼
Express (port 3001)
    ├─ POST /chat/chatbot
    │   ├─ CHAT_AGENT_V2_ENABLED=false → legacy /chat
    │   └─ CHAT_AGENT_V2_ENABLED=true  → /agent/chat-v2
    │           ▼
    │       Python ai-agent (port 8000)
    │           ├─ Router (deterministic | gemini | hybrid)
    │           ├─ Orchestrator (session memory, tool_trace)
    │           └─ Tool Registry
    │               ├─ search_tours → Express /internal/tools/search-tours
    │               ├─ get_tour_detail → Express /internal/tools/tour/:id
    │               ├─ faq_retrieval → FAISS faq_index.faiss + faq_metadata.json
    │               ├─ booking_policy_lookup → same index + category filter
    │               └─ fallback_response
    │           ▼
    │       AgentResponse → agentV2ResponseMapper → frontend contract
    │
    ├─ GET /internal/tools/search-tours  (INTERNAL_SERVICE_TOKEN)
    ├─ GET /internal/tools/tour/:id      (INTERNAL_SERVICE_TOKEN)
    ├─ GET /chat/logs     (Admin auth)
    └─ GET /chat/insights (Admin auth)
```

---

## 3. Agent V2 Tools

| Tool | Data source | Router triggers |
|------|-------------|-----------------|
| `search_tours` | Express internal API | Tour search keywords, entities |
| `get_tour_detail` | Express internal API | `TOUR001`-style IDs |
| `faq_retrieval` | FAISS FAQ index | TourGuide, FAQ, "là gì" service questions |
| `booking_policy_lookup` | FAISS FAQ index + category | hủy tour, hoàn tiền, thanh toán, giấy tờ, hỗ trợ |
| `fallback_response` | Deterministic | Greeting, out-of-domain, no match |

Retrieval wraps `pipelines.retrieval.RetrievalPipeline` (lazy singleton in `faq_retrieval_tool.py`).

---

## 4. Important Endpoints

| Service | Method | Path | Description |
|---------|--------|------|-------------|
| Python | GET | `/health` | Liveness |
| Python | GET | `/ready` | FAQ index + API key check |
| Python | POST | `/chat` | Legacy pipeline |
| Python | POST | `/agent/chat-v2` | Agent V2 |
| Express | POST | `/chat/chatbot` | Main chat (feature-flagged) |
| Express | GET | `/internal/tools/search-tours` | Agent tool |
| Express | GET | `/internal/tools/tour/:id` | Agent tool |

---

## 5. Important Env Flags

### Backend
- `CHAT_AGENT_V2_ENABLED` — route through agent-v2 (default `false`)
- `INTERNAL_SERVICE_TOKEN` — agent → Express auth
- `CHAT_ANALYTICS_ENABLED` — JSONL analytics

### AI Agent
- `AGENT_ROUTER_MODE` — `deterministic` | `gemini` | `hybrid`
- `FAQ_DISTANCE_THRESHOLD` — FAISS distance cutoff (default `12.0`)
- `GEMINI_API_KEY` / `GOOGLE_API_KEY` — Gemini routing + legacy chat
- `SESSION_TTL_SECONDS` — session memory TTL (Phase 3A)
- `EXPRESS_API_URL`, `INTERNAL_SERVICE_TOKEN` — Express tool client

---

## 6. Tests and Baseline

```bash
npm run build
cd backend && npm test
cd services/ai-agent && python -m pytest
```

| Suite | Count | Status |
|-------|-------|--------|
| React build | — | ✅ Pass |
| Backend tests | 89/89 | ✅ Pass |
| Python tests | 175/175 | ✅ Pass |

Key test files added in Phase 4A:
- `services/ai-agent/tests/test_faq_retrieval_tools.py`
- Backend mapper tests in `backend/tests/agentV2Integration.test.js`

---

## 7. Non-Negotiable Constraints

- Do not break legacy `/chat/chatbot` without feature flag
- Do not expose chain-of-thought
- Do not query MSSQL from Python — use Express internal tools for business data
- FAQ/policy retrieval uses existing FAISS index only (no Qdrant, no new corpus)
- Keep expected failures as stable HTTP 200
- No LangChain, LangGraph, CrewAI, LlamaIndex
- No Docker/Cloud/GKE/Terraform in current phases

---

## 8. Next Recommended Phase

### Phase 5A — Docker Compose Local Stack

Containerize the three-service demo for one-command local startup:

1. `Dockerfile` for `services/ai-agent` (Python FastAPI)
2. `Dockerfile` for `backend` (Express)
3. `docker-compose.yml` wiring frontend, backend, ai-agent with env templates
4. Document `docker compose up` in README

**Alternative:** Stop here and apply to AI/NLP or full-stack AI roles — Phase 4B docs (`CV_PROJECT_BULLETS.md`, `SCREENSHOT_CHECKLIST.md`, `Full Demo Path`) are sufficient for portfolio and interview evidence without Docker.

---

## 9. Quick Smoke Tests

```bash
# Policy question
curl -s -X POST http://localhost:8000/agent/chat-v2 \
  -H "Content-Type: application/json" \
  -d '{"query": "Hủy tour được không?"}'

# FAQ question
curl -s -X POST http://localhost:8000/agent/chat-v2 \
  -H "Content-Type: application/json" \
  -d '{"query": "TourGuide là gì?"}'

# Tour search (unchanged)
curl -s -X POST http://localhost:8000/agent/chat-v2 \
  -H "Content-Type: application/json" \
  -d '{"query": "Tìm tour Đà Lạt tháng 7"}'
```

See `docs/SMOKE_TEST_AI_AGENT.md` for full Phase 4A examples.
