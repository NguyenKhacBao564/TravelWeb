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
