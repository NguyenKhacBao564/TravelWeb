# TravelWeb AI Agent — Screenshot & Video Checklist

Capture these assets for portfolio, CV, or interview evidence. Store in a private folder or attach to your portfolio README — do not commit secrets or `.env` values.

---

## Chat & Agent behavior

| # | What to capture | How | Recommended caption |
|---|-----------------|-----|---------------------|
| 1 | Tour search query | ChatBox: *"Tìm tour Đà Lạt dưới 5 triệu"* with `CHAT_AGENT_V2_ENABLED=true` | "Agent V2 routes tour inventory queries to MSSQL-grounded search_tours tool." |
| 2 | Tour cards in response | Same screen showing `tourlist` cards below the assistant message | "Tour recommendations come from Express internal tools → MSSQL, not from LLM hallucination." |
| 3 | Multi-turn memory | Turn 1: *"Tôi muốn đi Đà Lạt"* → Turn 2: *"Dưới 5 triệu, đi 2 người"* (same session) | "Session memory merges destination, budget, and party size across turns (`memory_used: true`)." |
| 4 | Policy query | *"Hủy tour được không?"* | "Booking policy questions route to `booking_policy_lookup` with FAISS retrieval." |
| 5 | Payment / FAQ query | *"Thanh toán bằng MoMo được không?"* or *"TourGuide là gì?"* | "Payment policy and general FAQ use typed retrieval tools with `faq_sources` in the response." |

---

## Admin & observability

| # | What to capture | How | Recommended caption |
|---|-----------------|-----|---------------------|
| 6 | Admin AI Insights dashboard | Login as Admin → `/admin/ai-chat-insights` after several Agent V2 chats | "JSONL analytics: tool distribution, route source, memory usage, p95 latency — no raw user text." |
| 7 | Selected tool distribution | Zoom on `selected_tool_distribution` showing `search_tours`, `faq_retrieval`, etc. | "Structured observability for agent tool routing without exposing chain-of-thought." |

---

## Health & infrastructure

| # | What to capture | How | Recommended caption |
|---|-----------------|-----|---------------------|
| 8 | `/health` response | Terminal: `curl -s http://localhost:8000/health` | "AI Agent liveness endpoint for orchestration readiness." |
| 9 | `/ready` response | Terminal: `curl -s http://localhost:8000/ready` | "Readiness checks FAQ index and API key configuration." |
| 10 | Test suite green | Terminal: `npm run test:all` or separate backend + pytest output | "89 backend tests + 175 Python tests — agent routing, tools, mapper, session memory." |

---

## Code & architecture

| # | What to capture | How | Recommended caption |
|---|-----------------|-----|---------------------|
| 11 | Agent package structure | IDE file tree: `services/ai-agent/agent/` (router, orchestrator, tool_registry, memory) | "Modular agent layer: router → orchestrator → typed tool registry." |
| 12 | Tool wrappers | IDE: `services/ai-agent/services/tools/` | "Thin tool wrappers: Express client for tours, FAISS for FAQ/policy." |
| 13 | Internal tools curl | Terminal: authenticated `GET /internal/tools/search-tours?location=...` | "MSSQL tour data exposed only through Bearer-protected Express internal tools." |
| 14 | README architecture | Browser or IDE: README.md architecture diagram section | "Three-service layout: React → Express → Python Agent V2 with feature flag." |

---

## Optional video (60–90 seconds)

1. Start three terminals (ai-agent, backend, frontend) — quick cut, no secrets visible.
2. Open ChatBox → tour search → show cards.
3. Second message with memory follow-up.
4. Policy question → show FAQ-style answer.
5. Open Admin Insights → highlight Agent V2 metrics.
6. End on test command output or `/ready` curl.

**Caption:** "End-to-end demo of a portfolio AI Agent with tool routing, RAG, session memory, and admin analytics."

---

## Before publishing

- [ ] Blur or crop any `.env`, API keys, JWT cookies, or admin passwords
- [ ] Blur real user emails if visible in admin panels
- [ ] Confirm `CHAT_AGENT_V2_ENABLED=true` is mentioned so reviewers know which path is shown
- [ ] Link to GitHub repo and `docs/CV_PROJECT_BULLETS.md` from portfolio page
