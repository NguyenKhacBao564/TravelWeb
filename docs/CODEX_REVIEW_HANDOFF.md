# Codex / Reviewer Handoff — TravelWeb AI Agent

Concise context for code review, interview prep, or continuation by another agent. Read this before diving into the full chat history.

---

## Repository

| Item | Value |
|------|-------|
| **Branch** | `plan/travelweb-ai-agent-upgrade` |
| **Latest important commit** | `docs: Phase 4B - polish AI Agent demo and CV materials` (after Phase 4A: `ai-agent: Phase 4A - add FAQ and booking policy tools`) |
| **What it is** | Vietnamese tour booking web app + **portfolio/demo AI Agent** (not enterprise production) |

---

## Completed phases

| Phase | Summary |
|-------|---------|
| Cleanup A–E | Git hygiene, import ai-agent into repo, remove hardcoded IPs |
| Phase 0 | Integration hardening, health/ready, analytics fields |
| Phase 1A | Express `/internal/tools/*` with Bearer auth |
| Phase 1B | Python `express_tools_client` |
| Phase 2A | Tool registry + deterministic router + orchestrator |
| Phase 2B | `CHAT_AGENT_V2_ENABLED` feature flag + response mapper |
| Phase 2C | Gemini / hybrid structured routing |
| Phase 3A | Session memory (`session_id`, TTL store) |
| Phase 3B | Admin AI Insights Agent V2 metrics |
| Phase 4A | `faq_retrieval` + `booking_policy_lookup` tools |
| Phase 4B | README, CV bullets, screenshot checklist, review handoff |

---

## Architecture (one paragraph)

React ChatBox calls Express `POST /chat/chatbot`. When `CHAT_AGENT_V2_ENABLED=true`, Express forwards to Python `POST /agent/chat-v2`. The Python agent routes (deterministic / gemini / hybrid), executes one tool per turn, and returns `AgentResponse` with `tool_trace`. Tour data flows Python → Express internal tools → MSSQL. FAQ/policy uses FAISS in-repo. Express maps the response to the frontend contract and logs privacy-safe JSONL for Admin Insights.

---

## Important files

### Python agent core
- `services/ai-agent/agent/orchestrator.py` — main run loop, session memory, response building
- `services/ai-agent/agent/router.py` — deterministic routing
- `services/ai-agent/agent/gemini_router.py` / `hybrid_router.py` — optional Gemini routing
- `services/ai-agent/agent/tool_registry.py` — tool registration
- `services/ai-agent/agent/memory.py` — in-process TTL session store
- `services/ai-agent/agent/schemas.py` — `AgentRequest` / `AgentResponse`
- `services/ai-agent/server.py` — FastAPI: `/health`, `/ready`, `/chat`, `/agent/chat-v2`

### Python tools
- `services/ai-agent/services/tools/search_tours_tool.py`
- `services/ai-agent/services/tools/get_tour_detail_tool.py`
- `services/ai-agent/services/tools/faq_retrieval_tool.py`
- `services/ai-agent/services/tools/booking_policy_lookup_tool.py`
- `services/ai-agent/services/express_tools_client.py`

### Express integration
- `backend/routes/internalToolRoutes.js`
- `backend/middlewares/internalServiceAuth.js`
- `backend/services/pythonChatbotClient.js` — legacy + Agent V2 HTTP client
- `backend/services/agentV2ResponseMapper.js` — AgentResponse → frontend contract
- `backend/services/chatAnalyticsLogger.js`
- `backend/services/chatInsightsService.js`
- `backend/controller/chatController.js` — feature flag branch

### Frontend
- `src/layouts/ChatBot/ChatBox.js` — `session_id` in localStorage
- `src/pages/Admin/AIChatInsights/AIChatInsights.js`

### Docs
- `docs/PROJECT_PHASE_CHECKPOINT.md` — current state snapshot
- `docs/SMOKE_TEST_AI_AGENT.md` — curl demo paths
- `docs/CV_PROJECT_BULLETS.md` — resume bullets

---

## Test commands

```bash
npm run build
npm run test:backend    # 89 tests
npm run test:agent      # 175 tests
npm run test:all        # build + both suites
```

---

## Key env flags (names only)

**backend/.env:** `CHAT_AGENT_V2_ENABLED`, `AI_AGENT_CHAT_V2_URL`, `PYTHON_CHATBOT_URL`, `INTERNAL_SERVICE_TOKEN`, `CHAT_ANALYTICS_ENABLED`

**services/ai-agent/.env:** `GEMINI_API_KEY` or `GOOGLE_API_KEY`, `EXPRESS_API_URL`, `INTERNAL_SERVICE_TOKEN`, `AGENT_ROUTER_MODE`, `SESSION_TTL_SECONDS`

---

## Known constraints (do not violate)

- Do not break legacy `/chat/chatbot` when `CHAT_AGENT_V2_ENABLED=false`
- Do not query MSSQL from Python — use Express internal tools only
- Do not expose chain-of-thought, raw prompts, or secrets in API/logs
- Do not add LangChain, LangGraph, CrewAI, LlamaIndex
- Expected AI failures return stable HTTP 200 with fallback messaging
- FAQ corpus is existing FAISS index only — no Qdrant rebuild in current phases

---

## What to review

1. **Tool routing correctness** — deterministic keywords vs Gemini JSON validation and fallback
2. **Security** — `INTERNAL_SERVICE_TOKEN` on internal tools; admin auth on `/chat/logs` and `/chat/insights`
3. **Contract stability** — `agentV2ResponseMapper` preserves `tourlist`, `faq_sources`, `tool_trace` shape
4. **Session memory** — merge logic, TTL, no raw query text stored by default
5. **Test coverage** — `tests/test_agent.py`, `tests/test_faq_retrieval_tools.py`, `tests/agentV2Integration.test.js`
6. **Docs accuracy** — README and smoke tests match actual env var names and endpoints

---

## What NOT to change during review

- Payment, booking checkout, auth, or admin business logic unrelated to AI chat
- Database schema
- Core routing logic unless a documented smoke-test command is provably wrong
- Removing dependencies or implementing Docker/Cloud/GKE/Terraform (Phase 5+)
- Logging raw conversation text or prompts

---

## Next recommended phase

**Phase 5A — Docker Compose local stack** (optional before job applications; Phase 4B docs are sufficient to apply for AI/NLP roles).

See `docs/PROJECT_PHASE_CHECKPOINT.md` for details.
