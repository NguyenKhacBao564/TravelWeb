# TravelWeb AI Agent — CV Project Bullets

Use these bullets on a resume, portfolio site, or LinkedIn project section. Wording is intentionally honest: this is a **portfolio/demo AI Agent system**, not a claim of enterprise production scale.

---

## Version A — NLP / AI Agent CV

**Title:** TravelWeb AI Agent — Business Tour Booking Assistant with Tool Routing and RAG Retrieval

**Tech:** React · Express.js · Python FastAPI · Gemini API · FAISS · MSSQL · Pydantic · JSONL analytics

**Bullets:**

1. Built a **ReAct-style conversational agent** that routes Vietnamese user queries to typed tools (`search_tours`, `faq_retrieval`, `booking_policy_lookup`) via a **Gemini structured JSON router** with deterministic and hybrid fallback modes — no chain-of-thought exposed to clients.

2. Implemented a **typed tool registry and orchestrator** with structured `tool_trace`, `route_source`, and feature-flagged rollout (`CHAT_AGENT_V2_ENABLED`) so legacy and Agent V2 chat paths coexist without breaking the frontend contract.

3. Added **FAISS-based RAG retrieval** for FAQ and booking-policy questions (cancellation, refund, payment, documents) using an in-repo `faq_index.faiss` corpus, with category-aware policy lookup and stable error shapes when the index is unavailable.

4. Designed **lightweight session memory** (in-process TTL) for multi-turn tour search, **MSSQL-grounded tour tools** through secure Express internal APIs (`INTERNAL_SERVICE_TOKEN`), and an **Admin AI Insights** dashboard aggregating tool distribution, latency, and memory usage from JSONL logs.

---

## Version B — DevOps / Cloud-ready AI Service CV

**Title:** TravelWeb AI Agent — Cloud-ready Multi-service AI Application

**Tech:** React · Express.js · Python FastAPI · Docker-ready layout · Feature flags · Bearer service auth · Health/readiness endpoints · JSONL observability

**Bullets:**

1. Structured a **three-service application** (React frontend, Express API gateway, Python FastAPI ai-agent) with clear service boundaries, shared env contracts, and a repository layout **prepared for Docker Compose and future Cloud Run/GKE deployment** (not yet deployed to cloud).

2. Implemented **health (`/health`) and readiness (`/ready`)** endpoints on the Python agent (FAQ index + API key checks), combined chat health on Express, and stable HTTP 200 fallbacks when upstream AI services are unavailable.

3. Secured **agent-to-backend tool calls** with `INTERNAL_SERVICE_TOKEN` Bearer auth on Express `/internal/tools/*` routes, keeping MSSQL access in the Node layer while the Python agent calls typed internal REST tools only.

4. Added **feature-flagged Agent V2 rollout**, privacy-safe **JSONL analytics** (no raw prompts, no chain-of-thought), and admin-facing aggregates (tool selection, route source, p95 latency, session/memory metrics) to support demo observability and future production hardening.

---

## Suggested one-liner (either version)

> Portfolio demo: Vietnamese tour booking web app with a feature-flagged AI Agent (Gemini routing, FAISS RAG, MSSQL-grounded tools, session memory, admin analytics).
