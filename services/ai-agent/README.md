# AI Agent Service — TravelWeb Chatbot

Vietnamese travel chatbot powered by FastAPI. Handles intent classification, entity extraction (location, time, price), FAQ retrieval via FAISS, and tour search.

> **Status:** This is the imported chatbot runtime (formerly at `../AI_Project/Chatbot_AI/`). It is the current production chatbot — not yet the new ReAct-style AI Agent. See `docs/AI_AGENT_UPGRADE_PLAN.md` for the upgrade roadmap.

---

## Quick Start

**Requirements:** Python 3.11+

```bash
# 1. Create virtual environment
cd services/ai-agent
python -m venv .venv
source .venv/bin/activate      # Windows: .venv\Scripts\activate

# 2. Install dependencies
pip install -r requirements.txt

# 3. Configure environment
cp .env.example .env
# Edit .env and add your GEMINI_API_KEY (or GOOGLE_API_KEY)

# 4. Start the service
uvicorn server:app --host 0.0.0.0 --port 8000 --reload
```

---

## Health Check

```bash
curl http://localhost:8000/health
# {"status":"ok"}
```

> **Note:** `GET /health` does not require `GEMINI_API_KEY`. It only checks that the FastAPI app is running. Full `/chat` functionality requires a valid API key in `.env`.

---

## Chat Endpoint

```bash
curl -s -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d '{"query": "Tôi muốn tìm tour Đà Lạt tháng 6 ngân sách 5 triệu", "user_id": "test_user"}'
```

Response shape:

```json
{
  "status": "partial_search",
  "message": "...",
  "entities": { "location": "...", "time": "...", "price": ... },
  "missing_fields": ["time"],
  "tours": [...],
  "faq_sources": [],
  "search_metadata": { "query_intent": "...", "related_keywords": [], "content_category": "...", "faq_opportunity": false }
}
```

Status values: `missing_info`, `partial_search`, `success`, `no_results`, `faq`.

---

## Project Structure

```
services/ai-agent/
├── server.py                   # FastAPI app entry point
├── requirements.txt             # Python dependencies
├── google_genAI.py             # Gemini LLM integration
├── extractors/                  # NLP entity extractors (location, time, price)
├── pipelines/                  # Retrieval pipeline (FAISS) + tour pipeline
├── repositories/                # Tour data repository
├── schemas/                    # Pydantic request/response models
├── services/                   # Business logic (tour search, entity normalizer, search metadata)
├── tests/                      # Python unit tests (pytest)
├── docs/ai_context/            # Architecture, decisions, roadmap notes
├── data/
│   ├── tours_sample.json       # Sample tour data for local fallback search
│   ├── processed/               # Cleaned intent + FAQ training data
│   └── raw/                    # Raw source data files
├── faq_index.faiss             # FAISS index for FAQ retrieval (~5MB)
├── faq_metadata.json           # FAQ metadata for retrieval (~1.3MB)
└── .env.example                # Environment variable template
```

---

## Key Dependencies

| Package | Purpose |
|---------|---------|
| `fastapi` + `uvicorn` | Web framework |
| `pydantic` | Request/response validation |
| `faiss-cpu` | FAQ vector similarity search |
| `sentence-transformers` | Multilingual sentence embeddings (paraphrase-multilingual-MiniLM-L12-v2) |
| `google-genai` | Gemini LLM for natural language generation |
| `transformers` + `torch` | PhoBERT fine-tuned intent classifier |
| `python-dotenv` | Environment variable loading |

---

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Service health check |
| `POST` | `/chat` | Main chat endpoint (intent → extraction → search → response) |
| `POST` | `/reset` | Reset session for a given `user_id` |

---

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `GOOGLE_API_KEY` | Yes | — | Google AI API key (legacy, required for Gemini generation) |
| `GEMINI_API_KEY` | No | — | Alternative to `GOOGLE_API_KEY` for future compatibility |
| `GEMINI_MODEL` | No | `gemini-2.0-flash` | Gemini model name |
| `TOUR_DATA_FILE` | No | `data/tours_sample.json` | Path to local tour JSON file |
| `LOG_LEVEL` | No | `INFO` | Python logging level |

---

## Express Integration

The Express backend (`backend/`) proxies chat requests to this service:

```
Frontend → Express GET/POST /chat → Python FastAPI /chat → Express response
```

The Express layer (`backend/services/pythonChatbotClient.js`) normalizes the Python response and appends DB tour results before returning to the frontend.

Contract: See `docs/chatbot-integration-refactor.md`.
