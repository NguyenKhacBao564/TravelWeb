# TravelWeb AI Agent Upgrade Plan

> **Document status:** Planning only — no implementation in this phase.  
> **Branch context:** `plan/travelweb-ai-agent-upgrade`  
> **Last audited:** 2026-06-09  
> **Audited paths:** `src/`, `backend/`, `docs/`, `sql_*.sql`, `.github/workflows/`, `nginx*.conf`, `README.md`

---

## 1. Executive Summary

TravelWeb is an existing full-stack Vietnamese tour booking web application built with **React 19**, **Express.js**, and **Microsoft SQL Server**, already embedding a floating AI chatbot for end users and an **Admin AI Chat Insights** dashboard. Today, NLP/LLM work is intended to live in a **separate Python FastAPI service** referenced by README as `../AI_Project/Chatbot_AI`, but that service is **not present inside this repository** and was not found in the local sibling workspace during audit — meaning the AI stack is documented and partially integrated at the Express boundary, but not version-controlled together with the web app.

The upgrade should evolve this into **TravelWeb AI Agent**: a business web app with an **explainable ReAct-style tool-routing agent** (custom FastAPI orchestrator, not a black-box framework), **grounded RAG retrieval** for FAQs/policies, **structured tour search tools** backed by MSSQL, **session memory**, and **admin analytics** over structured traces — while keeping Express as the product API gateway the React frontend already uses.

This improves NLP / LLM / AI Agent CV value because it demonstrates end-to-end design: intent routing, tool schemas, retrieval evaluation, observability, and production-minded fallbacks — not just a chat UI wrapper around a single `generate()` call. It also prepares for cloud deployment by defining clear service boundaries (React static app, Node gateway, Python agent, MSSQL, vector index volume) that map cleanly to **Docker Compose**, **Cloud Run**, and later **GKE + Terraform/Ansible**, without requiring a rewrite of the existing booking, payment, and admin features.

---

## 2. Current Repository Audit

### 2.1 Architecture (as-is, text diagram)

```
┌─────────────────────────────────────────────────────────────────────────┐
│ React 19 SPA (port 3000)                                                 │
│  src/App.js → FloatingChat (src/layouts/ChatBot/)                       │
│            → Admin AIChatInsights (src/pages/Admin/AIChatInsights/)      │
│  API clients: src/api/chatbotAPI.js, src/api/chatInsightsAPI.js         │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │ HTTP (REACT_APP_API_URL → :3001)
                                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ Express.js backend (backend/server.js, port 3001)                      │
│  /chat/chatbot  → chatController.createGetRespondChat                   │
│  /chat/health   → proxies Python health                                 │
│  /chat/logs     → JSONL tail (NO AUTH)                                  │
│  /chat/insights → JSONL aggregates (NO AUTH)                            │
│  /api/health    → process liveness                                      │
│  + /auth, /tours, /api/booking, /api/payment, /api/admin, ...           │
└───────────────┬───────────────────────────────┬─────────────────────────┘
                │ axios POST                    │ mssql (config/db.js)
                ▼                               ▼
┌───────────────────────────────┐   ┌─────────────────────────────────────┐
│ Python FastAPI (EXTERNAL)      │   │ Microsoft SQL Server               │
│ URL: PYTHON_CHATBOT_URL        │   │ Tour, Tour_Price, Tour_image,      │
│ Default: localhost:8000/chat   │   │ Booking, Customer, ...             │
│ NOT IN THIS REPO               │   │ sql_createTable.sql, sql_dataEx.sql│
│ README claims:                 │   └─────────────────────────────────────┘
│  PhoBERT + Gemini + FAISS      │
└───────────────────────────────┘
                │
                ▼
┌───────────────────────────────┐
│ JSONL analytics (local file)   │
│ backend/logs/chat_analytics.jsonl│
└───────────────────────────────┘
```

### 2.2 Frontend (React)

| Area | Path | Notes |
|------|------|-------|
| Entry / routing | `src/index.js`, `src/App.js` | Role-based routes: customer, Sales, Support, Admin |
| Floating chatbot | `src/layouts/ChatBot/FloatingChat.js`, `ChatBox.js`, `ChatBot.scss` | Mounted on public pages; hidden on `/admin`, `/businessemployee`, auth pages |
| Chat API client | `src/api/chatbotAPI.js` | `POST /chat/chatbot`, `GET /chat/health` |
| Admin insights UI | `src/pages/Admin/AIChatInsights/AIChatInsights.js` | Stat cards, distribution tables, recent events |
| Insights API client | `src/api/chatInsightsAPI.js` | `GET /chat/insights`, `GET /chat/logs` (unauthenticated) |
| API base URL | `src/utils/API_Port.js` | `REACT_APP_API_URL` default `http://localhost:3001` |
| Auth | `src/context/AuthContext.js`, `src/components/ProtectedRoute.js` | Cookie/JWT roles: `customer`, `Sales`, `Support`, `Admin` |
| Consultant chat page | `src/pages/ConsultantEmployee/ChatBot.js` | **Commented out / unused stub** |

**Chat UX today:** stateless per browser tab except `localStorage` key `tourguide_chat_user_id`. No `session_id` sent to backend. No streaming. Tour cards rendered inline (max 3) with links to `/booking?id=`.

### 2.3 Express backend

| Layer | Key files |
|-------|-----------|
| Server bootstrap | `backend/server.js` |
| Chat routes | `backend/routes/chatRoutes.js` |
| Chat controller | `backend/controller/chatController.js` |
| Python HTTP client | `backend/services/pythonChatbotClient.js` |
| Entity normalization + MSSQL search | `backend/services/chatTourSearchService.js` |
| Response mapping / fallbacks | `backend/services/chatResponseMapper.js` |
| JSONL logger | `backend/services/chatAnalyticsLogger.js` |
| Insights aggregator | `backend/services/chatInsightsService.js` |
| DB pool | `backend/config/db.js` |
| Tests | `backend/tests/chatIntegration.test.js` (~800 lines, Node native test) |

**Chat pipeline (actual code path):**

1. `POST /chat/chatbot` receives `{ query, user_id? }`.
2. Express calls Python `POST PYTHON_CHATBOT_URL` with `{ query, user_id? }`.
3. `normalizePythonChatbotPayload()` validates status ∈ `{ missing_info, partial_search, success, no_results, faq }`.
4. If status requires DB (`partial_search`, `success`, `no_results`), `searchToursByChatEntities()` runs parameterized MSSQL query.
5. `resolveFinalStatus()` may downgrade Python `success` → `no_results` if DB returns zero tours.
6. `buildChatApiResponse()` shapes frontend payload; preserves `search_metadata` **only if still on pythonPayload** (see debt below).
7. Fire-and-forget `logChatEvent()` appends JSONL (stores `query_len`, not raw query).
8. On any Python/contract error → HTTP 200 with `buildFallbackResponse()` (`status: ai_unavailable`).

**Other Express domains (unchanged by chat):** auth (`backend/routes/authRoutes.js`), booking, VNPay/MoMo payment (`backend/config/vnpay.js`, `backend/config/momo.js`), admin CRUD (`backend/routes/adminRoutes.js` — JWT + `restrictTo('admin')`).

### 2.4 Python / FastAPI AI service

| Finding | Detail |
|---------|--------|
| In-repo Python | **None** — no `requirements.txt`, `pyproject.toml`, or `server.py` in TravelWeb |
| Documented location | README: `../AI_Project/Chatbot_AI` with `uvicorn server:app --port 8000` |
| Local audit | Sibling path not present under `/Users/nguyen_bao/Projects/AIproject/WebAI/` |
| Contract consumed by Express | `POST /chat` body `{ query, user_id? }`; response fields: `status`, `message`/`response`, `entities`, `missing_fields`, `faq_sources`, optional `search_metadata` |
| Health | Express derives `GET {base}/health` from chat URL |

**Implication:** The first implementation priority must be **bringing the AI agent service into the repo** (vendor or `services/ai-agent/`) so the portfolio artifact is self-contained and deployable.

### 2.5 Gemini API usage

| Location | Usage |
|----------|-------|
| `package.json` (root) | `@google/generative-ai` dependency listed |
| `backend/server.js` | `GoogleGenerativeAI` import **commented out** |
| In-repo runtime | **No active Gemini calls in TravelWeb** |
| README | Claims Gemini used inside external Python chatbot for response generation |

**Plan assumption:** Gemini should be called **only from the Python AI agent service** via `GEMINI_API_KEY`, not from Express (keeps secrets and token logic in one place).

### 2.6 PhoBERT / entity extraction

| Finding | Detail |
|---------|--------|
| In TravelWeb repo | **Not implemented** — only README documentation |
| Express-side entities | Normalized in `chatTourSearchService.normalizeChatEntities()` from Python-returned JSON |
| Deterministic slug map | `DESTINATION_SLUG_SEARCH_TERMS` in `chatTourSearchService.js` (12 Vietnamese destinations) |

### 2.7 FAISS retrieval

| Finding | Detail |
|---------|--------|
| In TravelWeb repo | **Not implemented** |
| README | Claims FAISS FAQ retrieval in Python service |
| Express | Passes through `faq_sources` array when Python provides it; no local vector index |

### 2.8 MSSQL / data access

| Item | Detail |
|------|--------|
| Driver | `mssql` + `tedious` via `backend/config/db.js` |
| Pattern | Raw SQL in services/controllers; **no ORM layer** in backend despite `sequelize` in root `package.json` |
| Chat search | `buildChatTourSearchQuery()` — filters `Tour` + `Tour_Price`, status `active`/`upcoming`, adult price |
| Resilience | DB connection/query failures return empty `tourlist` without failing chat (`chatTourSearchService.js`) |
| Schema scripts | `sql_createTable.sql`, `sql_dataEx.sql`, `sql_chatbot_demo_tours_dalat_phuyen_hue.sql`, `sql_future_tours_2026_2027.sql` |

### 2.9 Admin dashboard / analytics (existing)

| Feature | Status |
|---------|--------|
| Admin business dashboard | `src/pages/Admin/Dashboard/Dashboard.js` + `backend/services/admin/dashboardServices.js` |
| AI Chat Insights page | **Exists** — `src/pages/Admin/AIChatInsights/AIChatInsights.js`, sidebar link in `src/utils/SideBarItem.js` |
| Data source | File-based JSONL only (`CHAT_ANALYTICS_LOG_PATH`) |
| Metrics today | `total_chats`, `fallback_rate`, `status_distribution`, `top_destinations`, `query_intent_distribution`, `content_category_distribution`, `faq_opportunities_count`, `no_result_searches`, `avg_latency_ms`, `recent_events` |
| Auth on `/chat/insights` | **Missing** — README explicitly warns about this |
| Charts | Tables + `StatCard` components; **no time-series charts** for AI metrics yet |

### 2.10 Logging, latency, health

| Capability | Implementation |
|------------|----------------|
| Per-request latency | `chatController.js` tracks `pythonLatency`, `dbLatency`, `totalLatency` |
| Structured console logs | JSON lines with `event: chat_request` |
| JSONL analytics | `backend/services/chatAnalyticsLogger.js`, env `CHAT_ANALYTICS_ENABLED` |
| Privacy | Logs `query_len`, not raw query text |
| Health endpoints | `GET /api/health` (Express), `GET /chat/health` (Express + Python probe) |
| Prometheus `/metrics` | **Not present** |
| Request ID / correlation | **Not present** |

### 2.11 Docker / deployment / environment

| Item | Status |
|------|--------|
| `Dockerfile` | **Not in repo** |
| `docker-compose.yml` | **Not in repo** |
| `.github/workflows/deploy.yml` | EC2 frontend-only deploy (build React → scp → nginx); backend expected at VPN IP `100.90.83.88:3001` |
| `nginx-proxy.conf` / `fix-nginx-config.conf` | Proxy `/api/`, `/chat/`, `/auth/`, etc. to backend upstream |
| `.env.example` | Root: `REACT_APP_API_URL`; Backend: DB, JWT, Python URL, analytics, VNPay, MoMo, Google OAuth, email |
| Production domain | `tourguideeeee.fun` referenced in CORS (`backend/server.js`) |

### 2.12 README / documentation quality

| Asset | Quality |
|-------|---------|
| `README.md` | Strong Vietnamese setup guide; detailed AI chatbot architecture section with curl examples |
| `docs/chatbot-integration-refactor.md` | Good Express↔Python contract doc (path references stale external machine path) |
| API OpenAPI | **None** |
| Agent design doc | **This plan** (to be canonical) |
| Runbooks | **None** |

### 2.13 Existing strengths

1. **Clear service boundary** already documented: Python = NLP, Express = orchestration + MSSQL truth, React = UX.
2. **Deterministic tour search** from extracted entities with tests (`chatIntegration.test.js`).
3. **Graceful degradation** when Python or MSSQL is down (HTTP 200 fallback, empty tours).
4. **Admin insights UI scaffold** already wired to backend aggregates.
5. **JSONL analytics** works without DB migration — good for MVP demos.
6. **Injectable controller factories** (`createGetRespondChat`) — test-friendly.
7. **nginx proxy rules** already route `/chat/` to backend.

### 2.14 Weaknesses and technical debt

1. **Python AI service not in repo** — biggest gap for reproducibility and CV demos.
2. **`normalizePythonChatbotPayload()` drops `search_metadata`** — returned object omits it; `buildChatApiResponse` reads `pythonPayload.search_metadata` from normalized payload → metadata likely **lost at runtime** unless fixed (tests mock full flow bypassing normalization gap).
3. **No agent tool routing** — single Python call; Express only does post-hoc DB search.
4. **No session memory** — multi-turn constraint collection relies entirely on external Python state (if any).
5. **Unauthenticated `/chat/insights` and `/chat/logs`** — security risk.
6. **`@google/generative-ai` in root package.json** — unused dependency noise.
7. **No Docker/Compose** — hard for reviewers to run full stack.
8. **Deploy workflow ships frontend only** — AI agent not part of CI/CD.
9. **No streaming** — chat feels batch-oriented.
10. **Duplicate tour price routes** in `server.js` (`/tourPrice` and `/tour-price`).
11. **Role string inconsistency** — `restrictTo('admin')` vs frontend `allowedRoles={["Admin"]}` (may be case-normalized elsewhere — verify during Phase 0).

### 2.15 Missing pieces for AI Agent / NLP CV positioning

| Missing piece | Priority |
|---------------|----------|
| In-repo FastAPI agent with explicit tool registry | P0 |
| ReAct / tool-call loop with structured trace logging | P0 |
| RAG index build pipeline + evaluation queries | P0 |
| Session memory contract (`session_id`) | P1 |
| Tool-level metrics (success/failure/latency) | P1 |
| `/metrics` Prometheus endpoint | P1 |
| Secured admin analytics API | P1 |
| Docker Compose for 3 services + optional MSSQL | P1 |
| Optional streaming `POST /chat/stream` | P2 |
| Qdrant migration path | P2 |
| GKE/Terraform portfolio track | P3 |

---

## 3. Target Product Definition

**Product name:** TravelWeb AI Agent — an AI assistant embedded into a tour booking web app.

### Target user flows

1. **Tour discovery** — User asks (Vietnamese/English): *"Tìm tour Đà Lạt tháng 12 dưới 5 triệu cho 4 người."* Agent extracts destination, budget, dates, party size.
2. **Session memory** — Follow-up *"Còn tour nào rẻ hơn không?"* reuses stored constraints without re-asking destination.
3. **Tool routing** — Agent chooses among:
   - `search_tours` (MSSQL-backed)
   - `faq_retrieval` (FAISS/Qdrant)
   - `booking_policy_lookup` (RAG over cancellation/payment docs)
   - `collect_user_constraints` (clarifying question)
   - `fallback_response` (out-of-domain / system failure)
4. **Grounded response** — Natural language answer cites retrieved policy/FAQ snippets when applicable; tour cards come **only** from MSSQL tool results (never hallucinated inventory).
5. **Admin observability** — Admin views intent distribution, top destinations, fallback rate, no-result queries, latency p50/p95, tool success rates, retrieval hit rate, common FAQ clusters.

### Non-goals (honest scope)

- Not a fully autonomous booking bot (optional `create_booking_draft` tool is Phase 10+).
- Not multi-agent CrewAI orchestration.
- Not claiming enterprise-scale traffic in CV copy.

---

## 4. Target Architecture

### 4.1 Component map (cloud-ready)

| Component | Technology | Responsibility |
|-----------|------------|----------------|
| Frontend | React (existing `src/`) | Chat UI, tour cards, admin insights dashboards |
| API gateway | Express (existing `backend/`) | Auth cookies, rate limit, proxy to agent, MSSQL tour tools **or** delegate tools to agent via internal HTTP |
| AI agent | **Python FastAPI** (`services/ai-agent/`) | ReAct loop, Gemini generation, FAISS RAG, session memory, structured traces |
| Business DB | MSSQL | Tours, bookings, payments (unchanged) |
| Vector index | FAISS files on volume | FAQ/policy/tour-description retrieval (MVP) |
| Analytics | JSONL → optional MSSQL table | AI event traces |
| Static assets | nginx / Cloud Storage / CDN | React build |

**Design choice — where MSSQL tour search runs:**

- **Recommended:** Keep `search_tours` tool implementation in **Express** initially (reuse `chatTourSearchService.js`) exposed as internal endpoint `GET /internal/tools/search-tours` called by Python agent with shared service token. Rationale: reuse tested SQL, single DB credential owner (Node), smaller Python container.
- **Alternative (later):** Duplicate read-only tour query in Python using `pyodbc` — only if agent must be fully standalone for Cloud Run scaling.

### 4.2 Diagram 1 — Chat request flow

```
User → React ChatBox
         POST /chat/chatbot { query, session_id, user_id? }
              → Express chatController
                   1) attach request_id, validate, rate-limit
                   2) POST /chat → Python agent
                        - load session memory
                        - ReAct: route → execute tool(s)
                        - Gemini: compose final message
                        - return { message, status, entities, tool_trace, tourlist? }
                   3) If agent delegated tour search to Express tool OR returns entities only:
                        Express may still run searchToursByChatEntities (transitional)
                   4) logChatEvent (JSONL) + metrics
              ← JSON response
         ← render markdown + tour cards
```

### 4.3 Diagram 2 — Agent tool routing flow

```
User query + session memory
        │
        ▼
┌───────────────────┐
│ Intent classifier │  ← lightweight: rules + optional PhoBERT/Gemini structured output
└─────────┬─────────┘
          │
    ┌─────┴─────┬─────────────┬──────────────┐
    ▼           ▼             ▼              ▼
search_tours  faq_retrieval  booking_policy  collect_constraints
    │           │             │              │
    ▼           ▼             ▼              ▼
 Express      FAISS          FAISS          (no external IO)
 MSSQL        top-k          top-k
    │           │             │
    └─────┬─────┴─────────────┘
          ▼
   Gemini synthesis (grounded on tool outputs only)
          ▼
   Structured response + tool_trace
```

### 4.4 Diagram 3 — RAG retrieval flow

```
Corpus files (faq.md, policies/*.md, tour_descriptions.json)
        │
        ▼
Chunker (500 tokens, 50 overlap, heading-aware)
        │
        ▼
Embedding (Gemini embedding API or sentence-transformers multilingual)
        │
        ▼
FAISS IndexFlatIP + docstore JSON (id → text, metadata)
        │
        ▼
Query → embed → top-k (k=5) → score threshold τ=0.72
        │
        ├─ score ≥ τ → return chunks as context
        └─ score < τ → fallback_response or collect_user_constraints
```

### 4.5 Diagram 4 — Admin analytics flow

```
Each chat request → structured trace event
        │
        ├─ MVP: append JSONL (extend schema with tool fields)
        └─ Later: insert MSSQL Ai_Chat_Event
        │
        ▼
Express GET /api/admin/ai-insights (JWT Admin only)
        │
        ▼
React AIChatInsights (+ charts Phase 7)
```

### 4.6 Diagram 5 — Future cloud deployment flow

```
                    ┌─────────────┐
                    │  Cloud CDN  │
                    │  React build│
                    └──────┬──────┘
                           │
┌──────────────┐    ┌──────▼──────┐    ┌─────────────────┐
│ Cloud Run    │◄───│ HTTPS LB    │───►│ Cloud Run       │
│ api-node     │    │             │    │ ai-agent        │
│ (Express)    │    └─────────────┘    │ + FAISS volume  │
└──────┬───────┘                         └────────┬────────┘
       │                                          │
       ▼                                          ▼
┌──────────────┐                         ┌─────────────────┐
│ Cloud SQL /  │                         │ Secret Manager  │
│ MSSQL (VPN)  │                         │ GEMINI_API_KEY  │
└──────────────┘                         └─────────────────┘

Track B (GKE): same images → Artifact Registry → Helm releases → HPA → Prometheus/Grafana
```

---

## 5. Proposed Repository Structure

### 5.1 Current structure assessment

The current layout is ** workable but not cloud-optimal**:

- Frontend and backend split at repo root (`src/` + `backend/`) is fine for a small team.
- **Missing:** `services/ai-agent/`, `infra/`, shared contracts, container definitions.
- Python outside repo is the main deployment and hiring-story blocker.

### 5.2 Option A — Minimal incremental restructuring (RECOMMENDED)

Keep `src/` and `backend/` in place; add:

```
TravelWeb/
├── src/                          # unchanged
├── backend/                      # unchanged (+ thin proxy extensions)
├── services/
│   └── ai-agent/                 # NEW: FastAPI ReAct agent
│       ├── app/
│       ├── data/corpus/
│       ├── indexes/faiss/
│       ├── tests/
│       ├── requirements.txt
│       └── Dockerfile
├── infra/
│   ├── docker/
│   │   ├── docker-compose.yml
│   │   └── docker-compose.dev.yml
│   └── cloud-run/                # service.yaml templates (later)
├── docs/
│   ├── AI_AGENT_UPGRADE_PLAN.md
│   ├── chatbot-integration-refactor.md
│   └── api/                      # OpenAPI exports (later)
└── packages/
    └── shared-contracts/         # optional JSON schemas for chat payloads
```

**Why recommend:** Smallest diff, preserves existing npm scripts (`npm run dev`), matches README mental model, easy phased commits.

### 5.3 Option B — Full monorepo restructure

```
apps/frontend/   ← move src/
apps/api-node/   ← move backend/
services/ai-agent/
packages/shared/
infra/docker|cloud-run|gke/
docs/
```

**When to use:** If team plans multiple frontends or extracts shared SDK — higher migration cost, not needed for internship portfolio MVP.

### 5.4 Recommendation

**Option A** for Phases 0–9; revisit Option B only if publishing separate deployable artifacts to Artifact Registry with distinct CI pipelines becomes necessary.

---

## 6. AI Agent Design

### 6.1 Framework decision

**Use a custom ReAct-style orchestrator in FastAPI — not LangChain/LangGraph/CrewAI for MVP.**

| Framework | Verdict |
|-----------|---------|
| LangChain | Heavy abstraction; harder to explain tool traces in interviews; dependency churn |
| LangGraph | Good for complex graphs later; overkill for 6 tools |
| LlamaIndex | Retrieval-focused; less clean for tool routing + business API |
| CrewAI | Implies multi-agent — oversells scope |
| **Custom FastAPI agent loop** | **Selected** — explicit `AgentStep` dataclass, readable in code review, matches "lightweight, inspectable" requirement |

Re-evaluate LangGraph in Phase 10+ only if conversation flows become genuinely branching (human handoff + booking draft + comparison loops).

### 6.2 Agent responsibilities

| Layer | Responsibility |
|-------|----------------|
| **Deterministic code** | Tool registry, JSON schema validation, session memory R/W, FAISS search, HTTP calls to Express tools, timeout/retry, trace logging, status enum mapping |
| **LLM (Gemini)** | Natural language understanding beyond rules, final response phrasing grounded on tool outputs, optional structured JSON for intent/tool selection |
| **Express** | Public API, auth, MSSQL tour search execution, analytics aggregation, rate limits |
| **React** | Render messages, tour cards, admin charts |

### 6.3 Tool list

#### Required tools

| Tool | Purpose |
|------|---------|
| `search_tours` | Query MSSQL catalog by filters |
| `get_tour_detail` | Fetch one tour by `tour_id` |
| `faq_retrieval` | RAG over FAQ corpus |
| `booking_policy_lookup` | RAG over cancellation/payment/refund policies |
| `collect_user_constraints` | Ask clarifying question; update memory |
| `fallback_response` | Safe generic answer when out-of-domain or infra failure |

#### Optional tools (Phase 8+)

| Tool | Purpose |
|------|---------|
| `compare_tours` | Side-by-side 2–3 tours from last search |
| `create_booking_draft` | Pre-fill booking session (no payment) |
| `recommend_itinerary` | Summarize `Tour_Schedule` rows |
| `handoff_to_support` | Create `Customer_Support_Request` draft |

### 6.4 Tool schemas (JSON Schema sketches)

#### `search_tours`

```json
{
  "type": "object",
  "properties": {
    "destination": { "type": "string" },
    "destination_normalized": { "type": "string" },
    "date_start": { "type": "string", "format": "date" },
    "date_end": { "type": "string", "format": "date" },
    "price_min": { "type": "number" },
    "price_max": { "type": "number" },
    "people_count": { "type": "integer", "minimum": 1 }
  },
  "additionalProperties": false
}
```

**Output:**

```json
{
  "tours": [ { "tour_id": "...", "name": "...", "price": 4200000, "destination": "..." } ],
  "total": 3,
  "status": "success | no_results | partial"
}
```

#### `get_tour_detail`

**Input:** `{ "tour_id": "TOUR1001" }`  
**Output:** `{ "tour": { ... }, "schedules": [ ... ], "prices": [ ... ] }`

#### `faq_retrieval` / `booking_policy_lookup`

**Input:** `{ "query": "string", "top_k": 5 }`  
**Output:**

```json
{
  "hits": [
    { "doc_id": "faq_012", "score": 0.81, "title": "...", "snippet": "..." }
  ],
  "retrieval_confident": true
}
```

#### `collect_user_constraints`

**Input:** `{ "missing_fields": ["date_start", "price_max"], "prompt_hint": "optional" }`  
**Output:** `{ "status": "missing_info", "missing_fields": ["date_start"] }`

#### `fallback_response`

**Input:** `{ "reason": "out_of_domain | llm_error | retrieval_miss | tool_timeout" }`  
**Output:** `{ "status": "faq | ai_unavailable", "message": "..." }`

### 6.5 Routing logic (deterministic first, LLM second)

```
1. Load session memory.
2. Run rule-based pre-router:
   - If greeting only → short-circuit welcome (no LLM).
   - If memory missing required fields for search → collect_user_constraints.
3. LLM structured call (Gemini JSON mode) returns:
   { "intent": "...", "selected_tool": "...", "tool_input": { ... } }
   Validated against tool schema.
4. Execute tool (max 2 tool calls per turn for MVP).
5. If search_tours + people_count → filter tours where available_seats >= people_count.
6. Gemini final message using ONLY tool outputs (system prompt forbids inventing tours).
7. Map to contract status: missing_info | partial_search | success | no_results | faq.
8. Emit tool_trace (structured, no chain-of-thought).
```

### 6.6 Failure handling

| Failure | Behavior |
|---------|----------|
| Gemini timeout | `fallback_response(reason=llm_error)` |
| FAISS index missing | Skip RAG tools → `fallback_response` with payment/FAQ contact info |
| Express tool 5xx | Empty tours + apologetic message; log `tool_status=error` |
| MSSQL down | `search_tours` returns `[]`; status `no_results` or partial |
| Invalid tool JSON from LLM | Retry once with repair prompt; then rule-based router |

### 6.7 Guardrails

- System prompt: *"Only recommend tours present in tool results."*
- Max input length: 1000 chars.
- Blocked topics list (medical, legal unrelated to travel) → `fallback_response(out_of_domain)`.
- PII: do not log raw queries in production analytics (keep `query_len` only).
- Vietnamese + English supported; reply in language detected from user message.

### 6.8 Trace logging (NO chain-of-thought)

Each turn writes:

```json
{
  "request_id": "uuid",
  "session_id": "uuid",
  "intent": "find_tour",
  "selected_tool": "search_tours",
  "tool_input_summary": { "destination": "Đà Lạt", "price_max": 5000000 },
  "tool_status": "success",
  "retrieved_doc_ids": ["faq_003"],
  "latency_ms": 842,
  "fallback_reason": null
}
```

---

## 7. RAG / Semantic Retrieval Plan

### 7.1 Documents to index

| Source | Content | Priority |
|--------|---------|----------|
| `services/ai-agent/data/corpus/faq.md` | General TourGuide FAQ | P0 |
| `services/ai-agent/data/corpus/policies/cancellation.md` | Cancel/refund rules | P0 |
| `services/ai-agent/data/corpus/policies/payment.md` | VNPay/MoMo, deposit | P0 |
| `services/ai-agent/data/corpus/policies/booking.md` | How to book, documents | P0 |
| Generated from MSSQL | Tour `description` + `Tour_Schedule.detail` | P1 (nightly rebuild) |
| `README.md` payment test section | Sandbox card info → **exclude from prod index** | Never in prod |

### 7.2 Chunking strategy

- Split on Markdown headings (`##`, `###`).
- Target **400–600 characters** per chunk (~100–150 words Vietnamese).
- Overlap **50 characters** between adjacent chunks in same section.
- Attach metadata: `{ doc_type, title, section, language, updated_at }`.

### 7.3 Embedding strategy

| Phase | Model |
|-------|-------|
| MVP | `text-embedding-004` (Gemini) — consistent with generation API |
| Offline dev fallback | `sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2` |

Store embedding model id in index manifest `index_manifest.json`.

### 7.4 FAISS index layout

```
services/ai-agent/indexes/faiss/
├── faq.index              # IndexFlatIP (cosine via normalized vectors)
├── faq_docstore.json      # id → { text, metadata }
├── policies.index
├── policies_docstore.json
└── index_manifest.json    # { version, embedding_model, chunk_count, built_at }
```

Separate indexes per corpus type enables targeted `faq_retrieval` vs `booking_policy_lookup`.

### 7.5 Metadata schema

```json
{
  "doc_id": "policy_cancel_02",
  "doc_type": "policy | faq | tour_description",
  "title": "Chính sách hủy tour",
  "section": "Hủy trước 7 ngày",
  "language": "vi",
  "source_path": "policies/cancellation.md",
  "updated_at": "2026-06-01T00:00:00Z"
}
```

### 7.6 Retrieval parameters

- `top_k = 5`
- `score_threshold = 0.72` (cosine similarity on normalized vectors — tune in eval)
- `retrieval_confident = hits[0].score >= threshold`
- If no hit above threshold → `fallback_response(retrieval_miss)` or ask clarifying question

### 7.7 Qdrant migration path (optional)

1. Export docstore JSON unchanged.
2. Create Qdrant collection `travelweb_faq` with same vector size.
3. Implement `VectorStore` interface with drivers: `FaissStore`, `QdrantStore`.
4. Env var `VECTOR_BACKEND=faiss|qdrant`.
5. Cloud Run: prefer Qdrant Cloud or self-hosted on GKE with persistent volume.

### 7.8 Retrieval evaluation

Create `services/ai-agent/tests/retrieval_eval.json`:

```json
[
  { "query": "hủy tour được không", "expected_doc_type": "policy", "min_score": 0.7 },
  { "query": "thanh toán momo", "expected_doc_id_prefix": "policy_payment" }
]
```

CI script fails if recall@1 < 80% on gold set (20 queries).

---

## 8. Session Memory Plan

### 8.1 Memory fields

```json
{
  "session_id": "sess_uuid",
  "user_id": "web_uuid | null",
  "destination": "Đà Lạt",
  "destination_normalized": "da-lat",
  "budget": { "price_min": null, "price_max": 5000000 },
  "dates": { "date_start": "2026-12-01", "date_end": "2026-12-31" },
  "people_count": 4,
  "preferences": { "transport": null, "duration_days": null },
  "last_intent": "find_tour",
  "last_recommended_tours": ["TOUR1001", "TOUR1002"],
  "conversation_turns": [
    { "role": "user", "content_len": 42, "ts": "..." },
    { "role": "assistant", "status": "partial_search", "ts": "..." }
  ],
  "updated_at": "..."
}
```

Store **content_len** in turns for analytics, not full text (privacy).

### 8.2 MVP storage

- **In-process dict** keyed by `session_id` with TTL 24h — acceptable for local demo.
- Persist file snapshot `services/ai-agent/data/sessions/sessions.json` optional for dev restart survival.

### 8.3 Cloud-ready storage

- **Redis** (Cloud Memorystore) with TTL — recommended for Cloud Run/GKE.
- Key: `travelweb:session:{session_id}`.

### 8.4 Avoid overengineering

- No vector memory / long-term user profiling in MVP.
- Max 10 turns retained; older turns dropped FIFO.
- Merge new entities from each turn (later values override earlier unless null).

### 8.5 Reset memory

- Frontend "Xóa hội thoại" generates new `session_id` (keep `user_id`).
- API: `POST /chat` with header `X-Session-Reset: true` or body `{ "reset_session": true }`.

### 8.6 Frontend changes (planned)

- `ChatBox.js`: add `session_id` in `localStorage` (`tourguide_chat_session_id`).
- Send `{ query, user_id, session_id }` to Express.

---

## 9. API Design

### 9.1 FastAPI AI Agent service

Base URL env: `AI_SERVICE_URL` (default `http://localhost:8000`)

#### `GET /health`

| | |
|-|-|
| **Purpose** | Liveness |
| **Response 200** | `{ "status": "ok", "service": "travelweb-ai-agent", "version": "0.1.0" }` |
| **Logging** | None |

#### `GET /ready`

| | |
|-|-|
| **Purpose** | Readiness — FAISS manifest exists, Gemini key configured |
| **Response 200** | `{ "status": "ready", "faiss": true, "gemini": true }` |
| **Response 503** | `{ "status": "not_ready", "faiss": false, "reason": "index missing" }` |

#### `GET /metrics`

| | |
|-|-|
| **Purpose** | Prometheus text exposition |
| **Auth** | Internal network only / bearer token in prod |
| **Metrics** | See Section 11 |

#### `POST /chat`

**Request:**

```json
{
  "query": "Tìm tour Đà Lạt tháng 6",
  "session_id": "sess_abc",
  "user_id": "web_uuid_optional",
  "context": {
    "locale": "vi",
    "channel": "web_floating_chat"
  }
}
```

**Response 200:**

```json
{
  "status": "partial_search",
  "message": "Em tìm được 3 tour Đà Lạt trong ngân sách của anh/chị.",
  "entities": {
    "location": "Đà Lạt",
    "destination_normalized": "da-lat",
    "price_max": 5000000
  },
  "missing_fields": [],
  "tourlist": [],
  "faq_sources": [],
  "search_metadata": {
    "query_intent": "find_tour_with_location",
    "content_category": "tour_search",
    "faq_opportunity": false
  },
  "tool_trace": [
    {
      "selected_tool": "search_tours",
      "tool_status": "success",
      "latency_ms": 120
    }
  ]
}
```

**Note:** During transition, `tourlist` in public API may still be filled by Express MSSQL layer even if Python returns entities only — document in changelog.

**Error 400:** `{ "error": "validation_error", "details": [...] }`  
**Error 429:** rate limited  
**Timeout:** Express enforces `PYTHON_CHATBOT_TIMEOUT_MS` (15000); Python internal tool timeout 5000ms each.

**Logging:** Python emits structured JSON per request; Express forwards `request_id`.

#### `POST /chat/stream` (optional, Phase 8)

- SSE: events `token`, `tool_start`, `tool_end`, `final`.
- Fallback to non-stream if `Accept: text/event-stream` not set.

#### `POST /agent/trace` (dev only)

- Returns last N structured traces for session — **disabled in production** via `ENABLE_DEBUG_TRACE=false`.

#### `POST /index/rebuild` (local admin)

- Body: `{ "corpus": "faq | policies | all" }`
- Rebuilds FAISS from `data/corpus/`.
- Protect with `ADMIN_API_KEY`.

### 9.2 Express backend (public + internal)

#### Existing (keep, extend)

| Method | Path | Change |
|--------|------|--------|
| POST | `/chat/chatbot` | Add `session_id`, propagate `request_id`, fix `search_metadata` passthrough |
| GET | `/chat/health` | Include agent `/ready` status |
| GET | `/chat/logs` | **Add Admin JWT** |
| GET | `/chat/insights` | **Add Admin JWT**; extend aggregates |

#### New (recommended)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/admin/ai-insights` | Authenticated alias to insights (move admin path) |
| GET | `/internal/tools/search-tours` | Agent tool endpoint (service token) |
| GET | `/internal/tools/tour/:tour_id` | Tour detail tool |

**`POST /chat/chatbot` request (target):**

```json
{
  "query": "string (required, 1-1000)",
  "session_id": "string (optional, server generates if missing)",
  "user_id": "string (optional)"
}
```

**Response:** existing shape + optional `session_id`, `request_id`, `tool_trace` (sanitized).

**Fallback:** unchanged `ai_unavailable` HTTP 200.

---

## 10. Admin AI Insights Dashboard Plan

### 10.1 Metrics

| Metric | MVP (JSONL) | Later (DB) |
|--------|-------------|------------|
| Total chat sessions | distinct `session_id` count (after Phase 5) | same |
| Total messages | count events | same |
| Intent distribution | `query_intent` | same |
| Top destinations | `destination_normalized` / `location` | same |
| Fallback rate | `fallback_used` | same |
| No-result searches | `final_status=no_results` | same |
| Average latency | mean `latency_ms` | same |
| p95 latency | **Phase 7** — compute from JSONL | SQL percentile |
| Tool call success/failure | **Phase 7** — `tool_status` | same |
| Retrieval hit rate | `retrieved_doc_ids` non-empty | same |
| Most common FAQs | doc_id frequency | same |
| Conversion events | tour card click (optional) | Phase 8 — frontend event |

### 10.2 Data source

- Phase 0–7: `backend/logs/chat_analytics.jsonl` extended schema
- Phase 8+: optional `Ai_Chat_Event` MSSQL table (see Section 17)

### 10.3 Frontend components

| Component | File | Work |
|-----------|------|------|
| Stat cards | existing `StatCard` | Add p95, tool failure count |
| Distribution tables | `AIChatInsights.js` | Keep |
| Time-series chart | **new** `AIChatLatencyChart.js` | ApexCharts (already in deps) |
| Tool breakdown donut | **new** | `react-apexcharts` |
| Retrieval hit rate card | **new** | |

### 10.4 Backend endpoints

- Move consumer from `/chat/insights` → `/api/admin/ai-insights` with `authMiddleware` + `restrictTo('admin')`.
- Keep `/chat/insights` deprecated behind env flag for one release.

### 10.5 MVP vs later

| MVP | Later |
|-----|-------|
| Tables + 5 stat cards | Latency histogram, date range filter |
| Manual refresh button | Auto-refresh 60s |
| JSONL only | DB + export CSV |
| No raw query display | Redacted query samples with admin opt-in |

---

## 11. Observability / Logging / Metrics Plan

### 11.1 Application logs (structured JSON)

```json
{
  "ts": "2026-06-09T10:00:00Z",
  "level": "info",
  "service": "api-node | ai-agent",
  "request_id": "uuid",
  "session_id": "uuid",
  "user_id": "web_xxx",
  "intent": "find_tour",
  "selected_tool": "search_tours",
  "latency_ms": 920,
  "status": "success",
  "fallback_reason": null,
  "retrieval_top_k": 5,
  "error_type": null
}
```

### 11.2 Prometheus metrics

```
# HELP chat_requests_total Total chat requests
# TYPE chat_requests_total counter
chat_requests_total{status="success"} 120

chat_request_latency_seconds_bucket{le="1.0"} ...

agent_tool_calls_total{tool="search_tours",status="success"} 80
agent_tool_latency_seconds{tool="faq_retrieval"} ...

agent_fallback_total{reason="llm_error"} 3
retrieval_hit_total 45
retrieval_miss_total 12
llm_errors_total 2
```

### 11.3 Rollout

| Stage | Implementation |
|-------|----------------|
| MVP local | JSON logs to stdout + JSONL file |
| Phase 8 | `prometheus_client` in FastAPI `/metrics`; optional Express `prom-client` |
| Future | Grafana dashboard JSON in `infra/grafana/` |
| Future | ELK/OpenSearch via Filebeat DaemonSet on GKE |

---

## 12. Security and Reliability Plan

| Area | Plan |
|------|------|
| Secrets | `GEMINI_API_KEY`, JWT secrets, `INTERNAL_SERVICE_TOKEN` in env / Secret Manager — never in git |
| API key safety | Gemini only in ai-agent container |
| CORS | Keep explicit allowlist in `backend/server.js`; add prod frontend URL |
| Rate limiting | `express-rate-limit` on `/chat/chatbot`: 30 req/min/IP; stricter for anonymous |
| Validation | `zod` (Node) / `pydantic` (Python) for request bodies |
| Timeouts | Express→Python 15s; Python per-tool 5s; Gemini 10s |
| Gemini failure | `fallback_response` + increment `llm_errors_total` |
| FAISS missing | `/ready` 503; Express `/chat/health` → `degraded` |
| MSSQL unavailable | Empty tours; chat still responds |
| Admin endpoints | JWT + role Admin; consider IP allowlist for `/chat/logs` |
| Docker | Non-root user `appuser` in Dockerfiles (Phase 9) |
| Dependency scan | `npm audit` / `pip-audit` in CI advisory |

---

## 13. Cloud Deployment Readiness Plan

### Track A — Fast demo deployment

| Step | Action |
|------|--------|
| 1 | `infra/docker/docker-compose.yml`: services `frontend`, `api-node`, `ai-agent`, optional `mssql` |
| 2 | Build images locally; mount FAISS volume |
| 3 | Cloud Run: deploy `ai-agent` and `api-node` with min instances 0–1 |
| 4 | Cloud Storage + CDN for React static build |
| 5 | Secret Manager bindings for `GEMINI_API_KEY` |
| 6 | Health checks: Cloud Run uses `/health` + `/ready` |
| 7 | Public demo URL documented in README |

### Track B — DevOps / GKE portfolio

| Component | Plan |
|-----------|------|
| Images | Artifact Registry `asia-southeast1-docker.pkg.dev/...` |
| IaC | Terraform: VPC, GKE Autopilot, static IP, IAM, Artifact Registry |
| K8s | Helm chart `infra/gke/travelweb/` — Deployments, Services, Ingress |
| Ingress | nginx-ingress + cert-manager |
| Observability | kube-prometheus-stack; Ansible playbook install |
| Logging | EFK or Cloud Logging agent |
| HPA | Scale `ai-agent` on CPU + custom metric `chat_requests_total` |
| Load test | k6 script 50 VUs on `/chat/chatbot` |
| Runbook | `docs/runbooks/incident-ai-agent-down.md` |

**Do not implement Track B until Track A demo is stable.**

---

## 14. Testing and Evaluation Plan

### 14.1 Test categories

| Type | Location |
|------|----------|
| Unit tests | `backend/tests/`, `services/ai-agent/tests/` |
| API integration | extend `chatIntegration.test.js`; add `test_agent_chat.py` |
| Retrieval tests | `retrieval_eval.json` |
| Agent routing tests | mock Gemini returns fixed tool JSON |
| Fallback tests | Python down, FAISS missing, MSSQL down |
| Latency tests | assert p95 < 3s locally with mocks |
| Frontend | React Testing Library for `ChatBox` rendering states |
| Admin dashboard | mock insights API response |
| Manual demo checklist | `docs/demo-checklist.md` (create in Phase 7) |

### 14.2 Twenty concrete test queries

| # | Query | Expected route |
|---|-------|----------------|
| 1 | `Tìm tour Đà Lạt tháng 6` | `search_tours` |
| 2 | `Du lịch Phú Yên dưới 3 triệu` | `search_tours` + budget |
| 3 | `Tour Nha Trang tháng 7 cho 2 người` | `search_tours` + people_count |
| 4 | `Đi Sa Pa tháng 12` | `search_tours` + date |
| 5 | `Tour nào đang giảm giá?` | `search_tours` or FAQ |
| 6 | `Hủy tour được không?` | `booking_policy_lookup` |
| 7 | `Chính sách hoàn tiền` | `booking_policy_lookup` |
| 8 | `Thanh toán bằng VNPay hay MoMo?` | `faq_retrieval` / policy |
| 9 | `Cần giấy tờ gì khi đi tour?` | `faq_retrieval` |
| 10 | `TourGuide là gì?` | `faq_retrieval` |
| 11 | `Tôi muốn đi du lịch` | `collect_user_constraints` |
| 12 | `3 triệu` (follow-up after #11) | memory + `search_tours` or collect |
| 13 | `abc xyz 123` | `fallback_response` |
| 14 | `Viết code Python giúp tôi` | `fallback_response` out_of_domain |
| 15 | `Đà Lạt` | `collect_user_constraints` or partial search |
| 16 | `Hello` | greeting short-circuit |
| 17 | `tour Da Lat budget 5M December` | mixed EN/VI `search_tours` |
| 18 | `So sánh tour Đà Lạt và Nha Trang` | optional `compare_tours` |
| 19 | `Liên hệ nhân viên tư vấn` | FAQ / optional handoff |
| 20 | `Tour Côn Đảo còn chỗ không tháng 8` | `search_tours` + availability filter |

---

## 15. Implementation Phases

### Phase 0 — Baseline audit and safety

**Goal:** Freeze contracts, fix metadata passthrough, secure admin analytics, document run state.

**Tasks:**
- Fix `normalizePythonChatbotPayload` to preserve `search_metadata`.
- Add Admin JWT to `/chat/insights` and `/chat/logs` (or new `/api/admin/ai-insights`).
- Inventory external Python chatbot repo; decide import strategy (copy into `services/ai-agent/`).
- Add `request_id` middleware in Express.
- Document current env vars in `docs/ENV.md` (optional) or extend README.

**Files likely touched:**
- `backend/services/pythonChatbotClient.js`
- `backend/routes/chatRoutes.js`
- `backend/middlewares/authMiddlewares.js`
- `src/api/chatInsightsAPI.js`
- `docs/chatbot-integration-refactor.md`

**Acceptance criteria:**
- `npm test` in `backend/` passes.
- `search_metadata` appears in `/chat/chatbot` response when mocked.
- Admin insights return 401 without login.

**Risks:** Admin role case mismatch (`Admin` vs `admin`).

---

### Phase 1 — AI service cleanup and health endpoints

**Goal:** Create in-repo `services/ai-agent/` with FastAPI skeleton, `/health`, `/ready`, `/chat` stub.

**Tasks:**
- Scaffold FastAPI app mirroring existing Python contract (`status`, `entities`, `message`).
- `requirements.txt`: fastapi, uvicorn, pydantic, httpx, google-generativeai, faiss-cpu, numpy.
- Implement `/health`, `/ready` (check index manifest + API key).
- Wire README to new path; remove broken `../AI_Project` reference.
- Update `PYTHON_CHATBOT_URL` default to match.

**Files likely touched:**
- `services/ai-agent/**` (new)
- `README.md`
- `backend/.env.example`

**Acceptance criteria:**
- `uvicorn` starts; `curl localhost:8000/health` OK.
- Express `/chat/health` reports `ok` when agent up.

**Risks:** Python version mismatch on developer machines (pin 3.11).

---

### Phase 2 — Agent router and tool schemas

**Goal:** Custom ReAct orchestrator with tool registry and structured traces.

**Tasks:**
- Implement `AgentOrchestrator` with tool interface.
- Gemini structured JSON for `selected_tool` + `tool_input`.
- Rule-based pre-router (greeting, empty query).
- Return `tool_trace` in response (dev-visible).
- Unit tests for routing decisions (mock LLM).

**Files likely touched:**
- `services/ai-agent/app/agent/orchestrator.py`
- `services/ai-agent/app/agent/tools/base.py`
- `services/ai-agent/app/routes/chat.py`
- `services/ai-agent/tests/test_routing.py`

**Acceptance criteria:**
- 10 routing unit tests pass without real Gemini (mocked).
- Invalid tool JSON triggers repair then fallback.

**Risks:** Gemini JSON schema drift — pin model `gemini-2.0-flash` or stable equivalent.

---

### Phase 3 — Tour search tool

**Goal:** Connect `search_tours` and `get_tour_detail` to real data.

**Tasks:**
- Add Express internal endpoints wrapping `chatTourSearchService` + tour controller.
- Python tools call Express with `INTERNAL_SERVICE_TOKEN`.
- Map tool output to existing `tourlist` shape.
- Filter by `people_count` vs `available_seats`.

**Files likely touched:**
- `backend/routes/internalToolRoutes.js` (new)
- `backend/server.js`
- `services/ai-agent/app/agent/tools/search_tours.py`
- `services/ai-agent/app/clients/express_client.py`

**Acceptance criteria:**
- Query #1–4 from test set return non-empty `tourlist` against demo SQL data.
- Integration test: Express ↔ agent ↔ MSSQL.

**Risks:** exposing internal routes — must not be public.

---

### Phase 4 — FAQ/RAG retrieval

**Goal:** FAISS indexes for FAQ and policies; `faq_retrieval` + `booking_policy_lookup` tools.

**Tasks:**
- Author corpus markdown under `data/corpus/`.
- Build `scripts/build_index.py` + `POST /index/rebuild`.
- Implement retrieval with threshold.
- Wire tools into orchestrator.
- Add `retrieval_eval.json` tests.

**Files likely touched:**
- `services/ai-agent/data/corpus/**`
- `services/ai-agent/app/rag/**`
- `services/ai-agent/scripts/build_index.py`

**Acceptance criteria:**
- Queries #6–9 retrieve correct doc types.
- `retrieval_hit_rate` logged in trace.

**Risks:** Embedding API cost — batch embed at build time only.

---

### Phase 5 — Session memory

**Goal:** Multi-turn constraint collection works.

**Tasks:**
- Implement `SessionStore` (in-memory + TTL).
- Accept `session_id` from frontend through Express to agent.
- Merge entities into memory after each turn.
- `collect_user_constraints` reads memory gaps.

**Files likely touched:**
- `services/ai-agent/app/memory/session_store.py`
- `backend/controller/chatController.js`
- `src/layouts/ChatBot/ChatBox.js`
- `src/api/chatbotAPI.js`

**Acceptance criteria:**
- Test queries #11 + #12 work in one session.
- Clear chat generates new `session_id`.

**Risks:** Session stickiness on Cloud Run — need Redis before multi-instance prod.

---

### Phase 6 — Frontend chatbot integration

**Goal:** Polish UX for agent responses and tool transparency (without exposing CoT).

**Tasks:**
- Show `partial_search` / `no_results` badges.
- Display up to 3 tour cards (existing) + "Xem thêm" link to `/findtour` with query params.
- Optional typing indicator already exists.
- Pass `session_id`.

**Files likely touched:**
- `src/layouts/ChatBot/ChatBox.js`
- `src/layouts/ChatBot/ChatBot.scss`
- `src/api/chatbotAPI.js`

**Acceptance criteria:**
- Manual demo checklist items 1–10 pass.
- No regression on `FloatingChat` mount rules in `App.js`.

**Risks:** UI clutter if showing tool traces — keep dev-only flag.

---

### Phase 7 — Admin AI analytics dashboard

**Goal:** Extend insights for tool metrics and secure access.

**Tasks:**
- Extend JSONL schema: `session_id`, `selected_tool`, `tool_status`, `retrieved_doc_ids`, `request_id`.
- Update `chatInsightsService.js` aggregations (p95, tool failures, retrieval hit rate).
- Point `chatInsightsAPI.js` to `/api/admin/ai-insights` with credentials.
- Add latency line chart (ApexCharts).

**Files likely touched:**
- `backend/services/chatAnalyticsLogger.js`
- `backend/services/chatInsightsService.js`
- `src/pages/Admin/AIChatInsights/AIChatInsights.js`
- `src/api/chatInsightsAPI.js`

**Acceptance criteria:**
- Dashboard loads for Admin only.
- p95 and tool metrics visible after 20 test chats.

**Risks:** JSONL file growth — add rotation `chat_analytics.%Y%m%d.jsonl`.

---

### Phase 8 — Observability and metrics

**Goal:** Production-style metrics and optional streaming.

**Tasks:**
- Add `/metrics` to ai-agent (prometheus_client).
- Correlate `request_id` across Express and Python (header `X-Request-ID`).
- Optional SSE `/chat/stream` for token streaming.
- Log rotation + structured stdout.

**Files likely touched:**
- `services/ai-agent/app/metrics.py`
- `backend/middlewares/requestId.js` (new)
- `services/ai-agent/app/routes/chat_stream.py` (optional)

**Acceptance criteria:**
- Prometheus scrapes metrics locally.
- Grafana dashboard JSON committed (optional).

**Risks:** SSE complexity with Express proxy — may require direct agent URL in dev only.

---

### Phase 9 — Docker and Cloud Run readiness

**Goal:** One-command local stack + Cloud Run deployment docs.

**Tasks:**
- Dockerfiles for `api-node`, `ai-agent`, `frontend` (nginx stage).
- `docker-compose.yml` with env_file templates.
- Cloud Run service YAML examples in `infra/cloud-run/`.
- Update CI to build agent image (not only frontend).

**Files likely touched:**
- `infra/docker/docker-compose.yml`
- `services/ai-agent/Dockerfile`
- `backend/Dockerfile`
- `.github/workflows/deploy.yml` or new `docker-build.yml`
- `README.md`

**Acceptance criteria:**
- `docker compose up` brings full chat flow up.
- Cloud Run deploy runbook executes without undocumented steps.

**Risks:** MSSQL in Docker heavy — document host MSSQL + containerized agent/node pattern.

---

### Phase 10 — Optional GKE/Terraform/Ansible roadmap

**Goal:** Portfolio DevOps track documentation and stubs.

**Tasks:**
- Terraform modules (VPC, GKE, IAM) — plan only unless time permits.
- Helm chart skeleton.
- Ansible playbook for ingress-nginx + monitoring stack.
- k6 load test script.
- Runbooks for incident response.

**Files likely touched:**
- `infra/gke/**`, `infra/terraform/**`, `docs/runbooks/**`

**Acceptance criteria:**
- Architecture diagram and terraform plan reviewed.
- k6 script runs against staging.

**Risks:** Scope creep — keep as documentation + minimal stubs.

---

## 16. File-by-file Change Plan

| Path | Purpose | Change | Risk | Notes |
|------|---------|--------|------|-------|
| `services/ai-agent/app/main.py` | FastAPI entry | create | low | New service root |
| `services/ai-agent/app/agent/orchestrator.py` | ReAct loop | create | high | Core agent logic |
| `services/ai-agent/app/agent/tools/*.py` | Tool implementations | create | medium | One file per tool |
| `services/ai-agent/app/rag/faiss_store.py` | Vector retrieval | create | medium | |
| `services/ai-agent/app/memory/session_store.py` | Session memory | create | medium | |
| `services/ai-agent/app/routes/chat.py` | POST /chat | create | medium | |
| `services/ai-agent/app/routes/health.py` | health/ready | create | low | |
| `services/ai-agent/app/metrics.py` | Prometheus | create | low | Phase 8 |
| `services/ai-agent/requirements.txt` | Python deps | create | low | Pin versions |
| `services/ai-agent/Dockerfile` | Container | create | medium | Non-root user |
| `services/ai-agent/data/corpus/**` | RAG sources | create | low | Author content |
| `services/ai-agent/scripts/build_index.py` | Index builder | create | medium | |
| `services/ai-agent/tests/test_routing.py` | Agent tests | create | low | |
| `services/ai-agent/tests/retrieval_eval.json` | RAG gold set | create | low | |
| `backend/services/pythonChatbotClient.js` | HTTP client | update | medium | Pass session_id, metadata fix |
| `backend/controller/chatController.js` | Orchestration | update | medium | request_id, extended logging |
| `backend/services/chatAnalyticsLogger.js` | JSONL schema | update | low | Tool fields |
| `backend/services/chatInsightsService.js` | Aggregates | update | medium | p95, tools |
| `backend/services/chatTourSearchService.js` | MSSQL search | update | low | people_count filter |
| `backend/routes/chatRoutes.js` | Routes | update | medium | Admin auth |
| `backend/routes/internalToolRoutes.js` | Agent tools API | create | high | Lock down |
| `backend/middlewares/requestId.js` | Correlation | create | low | |
| `backend/middlewares/rateLimit.js` | Abuse prevention | create | medium | |
| `backend/server.js` | Mount routes | update | low | |
| `backend/.env.example` | Env docs | update | low | New vars |
| `backend/tests/chatIntegration.test.js` | Tests | update | medium | |
| `src/layouts/ChatBot/ChatBox.js` | Chat UI | update | medium | session_id |
| `src/api/chatbotAPI.js` | Client | update | low | |
| `src/api/chatInsightsAPI.js` | Admin client | update | medium | withCredentials |
| `src/pages/Admin/AIChatInsights/AIChatInsights.js` | Dashboard | update | medium | Charts |
| `infra/docker/docker-compose.yml` | Local stack | create | medium | |
| `backend/Dockerfile` | Node image | create | medium | |
| `README.md` | Setup/docs | update | low | Positioning |
| `docs/AI_AGENT_UPGRADE_PLAN.md` | This plan | create | low | |
| `docs/chatbot-integration-refactor.md` | Contract | update | low | Align with agent tools |
| `.github/workflows/deploy.yml` | CI/CD | update | high | Add agent build |
| `package.json` (root) | deps | update | low | Remove unused `@google/generative-ai` optional |

---

## 17. Data Model / Schema Change Plan

### 17.1 MVP — JSONL extended event (no MSSQL required)

```json
{
  "timestamp": "ISO8601",
  "request_id": "uuid",
  "session_id": "uuid",
  "user_id": "string",
  "query_len": 42,
  "status": "python status",
  "final_status": "resolved status",
  "fallback_used": false,
  "tours_count": 2,
  "latency_ms": 900,
  "location": "Đà Lạt",
  "destination_normalized": "da-lat",
  "date_start": "2026-06-01",
  "date_end": null,
  "price_min": null,
  "price_max": 5000000,
  "query_intent": "find_tour_with_location",
  "content_category": "tour_search",
  "faq_opportunity": false,
  "selected_tool": "search_tours",
  "tool_status": "success",
  "retrieved_doc_ids": ["faq_003"],
  "fallback_reason": null
}
```

### 17.2 Optional MSSQL table (Phase 8+)

```sql
CREATE TABLE Ai_Chat_Event (
    event_id        VARCHAR(36) PRIMARY KEY,
    request_id      VARCHAR(36) NOT NULL,
    session_id      VARCHAR(64) NULL,
    user_id         VARCHAR(64) NULL,
    query_len       INT NOT NULL,
    python_status   NVARCHAR(40) NULL,
    final_status    NVARCHAR(40) NULL,
    fallback_used   BIT NOT NULL DEFAULT 0,
    tours_count     INT NOT NULL DEFAULT 0,
    latency_ms      INT NULL,
    destination_normalized NVARCHAR(80) NULL,
    query_intent    NVARCHAR(80) NULL,
    selected_tool   NVARCHAR(40) NULL,
    tool_status     NVARCHAR(20) NULL,
    retrieved_doc_ids NVARCHAR(500) NULL,
    fallback_reason NVARCHAR(80) NULL,
    created_at      DATETIME2 NOT NULL DEFAULT SYSDATETIME()
);
CREATE INDEX IX_Ai_Chat_Event_CreatedAt ON Ai_Chat_Event(created_at DESC);
CREATE INDEX IX_Ai_Chat_Event_Session ON Ai_Chat_Event(session_id);
```

### 17.3 Migration strategy

- **MVP:** JSONL only — no migration.
- **Phase 8:** Add table via `sql_migrations/001_ai_chat_event.sql`; dual-write JSONL + MSSQL behind `AI_ANALYTICS_DB_ENABLED=true`.
- **Rollback:** Disable dual-write flag; drop table only if no dependent dashboards.

### 17.4 Schema required for MVP?

**No.** JSONL is sufficient for demo and admin dashboard through Phase 7.

---

## 18. Environment Variables Plan

### Frontend (`.env` / `.env.example` root)

| Variable | Status | Notes |
|----------|--------|-------|
| `REACT_APP_API_URL` | existing | Express base URL |

### Express (`backend/.env.example`)

| Variable | Status | Notes |
|----------|--------|-------|
| `PORT` | existing | default 3001 |
| `DB_USER` | existing | MSSQL |
| `DB_PASSWORD` | existing | MSSQL |
| `DB_SERVER` | existing | MSSQL |
| `DB_PORT` | existing | 1433 |
| `DB_DATABASE` | existing | |
| `ACCESS_TOKEN_SECRET` | existing | JWT |
| `REFRESH_TOKEN_SECRET` | existing | JWT |
| `PYTHON_CHATBOT_URL` | existing | → rename doc to `AI_SERVICE_CHAT_URL` optional |
| `PYTHON_CHATBOT_TIMEOUT_MS` | existing | 15000 |
| `CHAT_ANALYTICS_ENABLED` | existing | true/false |
| `CHAT_ANALYTICS_LOG_PATH` | existing | JSONL path |
| `GOOGLE_CLIENT_ID` | existing | OAuth |
| `VNPAY_*` / `MOMO_*` | existing | payments |
| `EMAIL_*` | existing | nodemailer |
| `AI_SERVICE_URL` | **new required** | alias/clarity for Python base `http://ai-agent:8000` |
| `INTERNAL_SERVICE_TOKEN` | **new required** | agent → Express internal tools |
| `GEMINI_API_KEY` | **new optional** on Node | **Should not be set on Node** — document as ai-agent only |
| `CORS_ORIGINS` | **new optional** | comma-separated override |
| `CHAT_RATE_LIMIT_WINDOW_MS` | **new optional** | default 60000 |
| `CHAT_RATE_LIMIT_MAX` | **new optional** | default 30 |
| `AI_ANALYTICS_DB_ENABLED` | **new optional** | Phase 8 dual-write |
| `ENABLE_DEBUG_CHAT_LOGS` | **new optional** | log query text in dev only |

### AI Agent (`services/ai-agent/.env.example`)

| Variable | Status | Notes |
|----------|--------|-------|
| `GEMINI_API_KEY` | **new required** | |
| `GEMINI_MODEL` | **new optional** | default `gemini-2.0-flash` |
| `GEMINI_EMBEDDING_MODEL` | **new optional** | default `text-embedding-004` |
| `EXPRESS_API_URL` | **new required** | `http://api-node:3001` |
| `INTERNAL_SERVICE_TOKEN` | **new required** | matches Express |
| `VECTOR_INDEX_PATH` | **new required** | `./indexes/faiss` |
| `VECTOR_BACKEND` | **new optional** | `faiss` |
| `RETRIEVAL_SCORE_THRESHOLD` | **new optional** | 0.72 |
| `LOG_LEVEL` | **new optional** | INFO |
| `ENABLE_DEBUG_TRACE` | **new optional** | false in prod |
| `SESSION_TTL_SECONDS` | **new optional** | 86400 |
| `REDIS_URL` | **new optional** | Phase 8+ cloud |

---

## 19. README / Documentation Plan

| Item | Action |
|------|--------|
| Project positioning | Title: **TravelWeb AI Agent** — tour booking + tool-routing assistant |
| Architecture diagram | Mermaid in README (3-service diagram) |
| Local setup | `docker compose up` + manual MSSQL steps |
| Demo script | 5-minute script: chat search, FAQ, admin insights |
| API docs | Link to FastAPI `/docs` + `docs/chatbot-integration-refactor.md` |
| Screenshots | Capture: floating chat with tour cards, admin insights dashboard, `/chat/health` |
| CV bullet summary | See Section 20 |
| Limitations | No autonomous booking; JSONL analytics; single-region demo |
| Claim discipline | Say "portfolio/demo deployment", not "enterprise-scale" |

---

## 20. CV Positioning Output

### Version A: NLP / AI Agent CV

**Title:** TravelWeb AI Agent — Vietnamese Tour Booking Assistant with Tool Routing & RAG

**Tech line:** Python (FastAPI), Gemini API, FAISS, PhoBERT/structured NLP, Node.js, React, MSSQL

**Bullets:**
1. Built a **ReAct-style conversational agent** that routes user queries to typed tools (`search_tours`, `faq_retrieval`, `booking_policy_lookup`) with JSON schema validation and structured traces for debugging without exposing chain-of-thought.
2. Implemented **grounded RAG** over FAQ and policy corpora using FAISS + multilingual embeddings, with score-threshold fallback and a 20-query retrieval evaluation set.
3. Integrated the agent into a production-shaped **React + Express** tour booking platform, grounding tour recommendations in **MSSQL inventory** rather than LLM hallucination.
4. Delivered an **Admin AI Insights** dashboard tracking intent distribution, fallback rate, retrieval hit rate, and latency — supporting data-driven prompt and corpus iteration.

### Version B: DevOps / Cloud AI Service CV

**Title:** TravelWeb AI Agent — Containerized AI Microservice on Cloud Run / GKE

**Tech line:** Docker, Cloud Run, GKE, Terraform, Prometheus, Grafana, FastAPI, Node.js, nginx

**Bullets:**
1. Split a monolithic demo into **containerized services** (React static frontend, Express API gateway, FastAPI agent) with health/readiness probes and graceful degradation when AI or DB dependencies fail.
2. Defined **Prometheus metrics** and structured JSON logging (`request_id`, `tool_status`, `latency_ms`) for chat and tool calls, with a path to Grafana dashboards and ELK ingestion.
3. Authored **Docker Compose** for local full-stack demos and **Cloud Run** deployment templates with Secret Manager integration for `GEMINI_API_KEY`.
4. Planned **GKE + Terraform + Helm** rollout (ingress, HPA, Artifact Registry) with k6 load tests and incident runbooks for AI service outages.

---

## 21. Final Recommended Next Step

### Start with **Phase 0 — Baseline audit and safety**, then immediately **Phase 1 — AI service in repo**.

**Why:** The Express integration and admin dashboard already exist, but the **Python agent is not in the repository**, which blocks reproducible demos, Docker, and honest CV storytelling. Phase 0 fixes a real `search_metadata` passthrough bug and closes the open admin analytics auth gap noted in README. Phase 1 makes the AI service cloneable and testable by any coding agent.

### Prompt for the next coding agent

```
You are implementing Phase 0 and Phase 1 of docs/AI_AGENT_UPGRADE_PLAN.md on branch plan/travelweb-ai-agent-upgrade.

Phase 0:
1. Fix backend/services/pythonChatbotClient.js so search_metadata is preserved through normalizePythonChatbotPayload.
2. Protect GET /chat/insights and GET /chat/logs with authMiddleware + restrictTo('admin'), and update src/api/chatInsightsAPI.js to send credentials.
3. Add request_id middleware to backend/server.js and include it in chatController logs.
4. Run cd backend && npm test — all tests must pass.

Phase 1:
1. Create services/ai-agent/ FastAPI project per the plan (health, ready, stub POST /chat matching existing contract).
2. Add services/ai-agent/requirements.txt and .env.example.
3. Update README.md local setup to use services/ai-agent instead of ../AI_Project/Chatbot_AI.
4. Verify: uvicorn + npm run dev + curl http://localhost:3001/chat/health returns python status ok.

Do not start Phase 2 tools yet. Commit in two logical commits: Phase 0, then Phase 1.
```

---

*End of plan.*
