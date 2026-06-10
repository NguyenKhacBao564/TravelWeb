# TravelWeb AI Agent — Ứng dụng Quản lý Tour Du lịch với AI Assistant

## TravelWeb AI Agent

**TravelWeb** is a Vietnamese tour booking web application with an embedded **portfolio/demo AI Agent** system. It is designed to showcase NLP and agent engineering patterns — not enterprise-scale production deployment.

**Stack:** React · Express.js · Microsoft SQL Server · Python FastAPI · Gemini API · FAISS · Docker-ready multi-service layout

**Agent V2 features (feature-flagged via `CHAT_AGENT_V2_ENABLED`):**

| Capability | Description |
|------------|-------------|
| Gemini structured tool routing | Optional `gemini` / `hybrid` router modes select tools via JSON |
| Deterministic fallback router | Rule-based routing when Gemini is off or fails |
| Typed tool registry | `search_tours`, `get_tour_detail`, `faq_retrieval`, `booking_policy_lookup`, `fallback_response` |
| Secure Express internal tools | Bearer `INTERNAL_SERVICE_TOKEN` — Python never queries MSSQL directly |
| MSSQL-grounded tour recommendations | Tour inventory from Express → MSSQL |
| FAQ & booking policy retrieval | FAISS index over `faq_index.faiss` + `faq_metadata.json` |
| Lightweight session memory | In-process TTL store for multi-turn constraints |
| Structured `tool_trace` | Observability without chain-of-thought |
| Admin AI Insights | JSONL analytics: tool distribution, latency, memory usage |

**Portfolio docs:** [`docs/CV_PROJECT_BULLETS.md`](docs/CV_PROJECT_BULLETS.md) · [`docs/SCREENSHOT_CHECKLIST.md`](docs/SCREENSHOT_CHECKLIST.md) · [`docs/CODEX_REVIEW_HANDOFF.md`](docs/CODEX_REVIEW_HANDOFF.md) · [`docs/SMOKE_TEST_AI_AGENT.md`](docs/SMOKE_TEST_AI_AGENT.md)

### Architecture

```
React ChatBox (:3000)
    │  POST /chat/chatbot  (+ session_id)
    ▼
Express API Gateway (:3001)
    │
    ├─ CHAT_AGENT_V2_ENABLED=false  →  Python POST /chat          (legacy pipeline)
    └─ CHAT_AGENT_V2_ENABLED=true   →  Python POST /agent/chat-v2  (Agent V2)
              │
              ▼
        Python FastAPI ai-agent (:8000)
              │
              ├─ Router: deterministic | gemini | hybrid  (AGENT_ROUTER_MODE)
              ├─ Orchestrator + session memory
              └─ Tool Registry
                    ├─ search_tours / get_tour_detail
                    │       → Express GET /internal/tools/*  →  MSSQL
                    ├─ faq_retrieval / booking_policy_lookup
                    │       → FAISS faq_index.faiss
                    └─ fallback_response
              │
              ▼
        AgentResponse (tool_trace, route_source, session_id, memory_used)
              │
              ▼
        agentV2ResponseMapper  →  frontend contract (tourlist, faq_sources)
              │
              ▼
        JSONL analytics  →  Admin AI Insights dashboard
```

### Local demo quickstart

**Prerequisites:** Node.js 18+, Python 3.11+, MSSQL with schema seeded (`sql_createTable.sql`, `sql_dataEx.sql`).

**Terminal 1 — AI Agent (port 8000):**

```bash
cd services/ai-agent
python -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
# Set in services/ai-agent/.env:
#   GEMINI_API_KEY=...          (or GOOGLE_API_KEY)
#   EXPRESS_API_URL=http://localhost:3001
#   INTERNAL_SERVICE_TOKEN=...  (must match backend)
#   AGENT_ROUTER_MODE=hybrid    (or deterministic)
uvicorn server:app --host 0.0.0.0 --port 8000 --reload
# Or from repo root: npm run dev:agent
```

**Terminal 2 — Backend (port 3001):**

```bash
cd backend
npm install && cp .env.example .env
# Set in backend/.env:
#   CHAT_AGENT_V2_ENABLED=true
#   AI_AGENT_CHAT_V2_URL=http://localhost:8000/agent/chat-v2
#   PYTHON_CHATBOT_URL=http://localhost:8000/chat
#   INTERNAL_SERVICE_TOKEN=...  (same value as ai-agent)
#   DB_* and JWT vars for MSSQL
npm run dev
```

**Terminal 3 — Frontend (port 3000):**

```bash
npm install
npm run dev                     # or: npm start
```

**Quick verification:**

```bash
curl -s http://localhost:8000/health    # AI Agent liveness
curl -s http://localhost:8000/ready       # FAQ index + API key
curl -s http://localhost:3001/chat/health # Express + Python combined

# Agent V2 tour search
curl -s -X POST http://localhost:3001/chat/chatbot \
  -H "Content-Type: application/json" \
  -d '{"query": "Tìm tour Đà Lạt dưới 5 triệu"}'
```

Full demo walkthrough: [`docs/SMOKE_TEST_AI_AGENT.md`](docs/SMOKE_TEST_AI_AGENT.md) — section **Full Demo Path**.

---

Đây là hướng dẫn thiết lập và chạy dự án **TravelWeb** — một ứng dụng full-stack đặt tour du lịch tích hợp AI Agent (React + Express + Python FastAPI + MSSQL).

---

## Mục lục

1. [Yêu cầu hệ thống](#yêu-cầu-hệ-thống)
2. [Cài đặt dự án](#cài-đặt-dự-án)
3. [Cấu trúc Repository](#cấu-trúc-repository)
4. [AI Chatbot Tích hợp](#ai-chatbot-tích-hợp)
   - [Kiến trúc](#kiến-trúc)
   - [Luồng hoạt động](#luồng-hoạt-động)
   - [Chạy AI Agent cục bộ](#chạy-ai-agent-cục-bộ)
   - [Backend Endpoints](#backend-endpoints)
   - [Giới hạn](#giới-hạn)
5. [Chạy ứng dụng](#chạy-ứng-dụng)
6. [Thông tin đăng nhập Test](#thông-tin-đăng-nhập-test)

---

## Yêu cầu hệ thống

Trước khi bắt đầu, hãy đảm bảo bạn đã cài đặt các công cụ sau:

* Node.js (phiên bản 18 trở lên được khuyến nghị)
* npm (thường đi kèm với Node.js)
* Python 3.11+ (cho AI Agent service)
* Microsoft SQL Server (bao gồm SQL Server Management Studio hoặc công cụ quản lý cơ sở dữ liệu khác)

## Cài đặt dự án

Thực hiện theo các bước dưới đây để thiết lập và chạy dự án.

### 1. Cài đặt các Dependencies

Mở terminal/command prompt và điều hướng đến thư mục gốc của dự án, sau đó chạy các lệnh sau:

npm install

Tiếp theo, điều hướng vào thư mục backend và cài đặt các dependencies riêng cho phần backend:

cd backend
npm install

2. Cấu hình Cơ sở dữ liệu (Microsoft SQL Server)
Dự án này sử dụng Microsoft SQL Server làm cơ sở dữ liệu.

Chuẩn bị Database:

Mở SQL Server Management Studio (SSMS) hoặc công cụ quản lý cơ sở dữ liệu MS SQL khác.
Kết nối đến instance SQL Server của bạn.
Tạo một cơ sở dữ liệu mới cho dự án này (ví dụ: TourBookingDB).
Tạo bảng và dữ liệu mẫu:

Chạy file sql_createTable.sql (nằm ở thư mục gốc của dự án) trên cơ sở dữ liệu bạn vừa tạo. File này sẽ tạo cấu trúc bảng cần thiết.
Sau khi tạo bảng, chạy file sql_dataEx.sql (nằm ở thư mục gốc của dự án) để điền dữ liệu mẫu vào các bảng.
Cấu hình kết nối Database:

Điều hướng đến thư mục backend/.

Tạo một file .env nếu nó chưa tồn tại (hoặc sao chép từ .env.example nếu có).

Mở file .env và cập nhật các biến môi trường sau để kết nối với cơ sở dữ liệu MS SQL của bạn:

DB_SERVER=your_sql_server_address  # Ví dụ: localhost, 127.0.0.1, hoặc tên server/instance
DB_DATABASE=TourBookingDB         # Tên cơ sở dữ liệu bạn đã tạo (ví dụ: TourBookingDB)
DB_USER=your_db_username          # Tên người dùng SQL Server của bạn
DB_PASSWORD=your_db_password      # Mật khẩu người dùng SQL Server của bạn

Lưu ý: Thay thế your_sql_server_address, TourBookingDB, your_db_username, và your_db_password bằng thông tin cấu hình SQL Server của bạn.

---

## Cấu trúc Repository

```
TravelWeb/
├── src/                          # React frontend (port 3000)
├── backend/                      # Express API gateway (port 3001)
├── services/
│   └── ai-agent/                 # Python FastAPI AI Agent (port 8000)
├── docs/                         # Tài liệu kỹ thuật & kế hoạch
├── sql_*.sql                     # Schema & seed data MSSQL
├── .env.example                  # Frontend env template
├── backend/.env.example          # Backend env template
├── package.json                  # Root scripts (dev, build, test)
└── README.md                     # This file
```

**Ba dịch vụ chính:**
| Dịch vụ | Thư mục | Cổng | Công nghệ |
|---------|---------|------|-----------|
| Frontend | `src/` | 3000 | React 19 + CRA |
| API Gateway | `backend/` | 3001 | Express.js |
| AI Agent | `services/ai-agent/` | 8000 | Python FastAPI |

---

## AI Chatbot Tích hợp

### Kiến trúc

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend (React)                         │
│  ┌─────────────────┐                        ┌────────────────┐   │
│  │  FloatingChat   │◄──── POST /chat/chatbot│  Admin Panel   │   │
│  │  (User trang    │                        │  /admin/      │   │
│  │   chính)        │──── GET /chat/logs     │  ai-chat-     │   │
│  └─────────────────┘──── GET /chat/insights │  insights     │   │
└──────────────────────────┬──────────────────────┬──────────────┘
                           │                      │
                     Express.js                Express.js
                     :3001                     :3001
                           │                      │
        ┌──────────────────▼──────────────────────▼───────────┐
        │                 Backend (Node.js / Express)          │
        │  ┌──────────────────────────────────────────────┐   │
        │  │         chatController (createGetRespondChat)  │   │
        │  │  1. fetchPythonChatbotResponse()               │   │
        │  │  2. normalizeChatEntities()                    │   │
        │  │  3. searchToursByChatEntities() (MSSQL)        │   │
        │  │  4. resolveFinalStatus()                       │   │
        │  │  5. logAnalytics() (JSONL)                     │   │
        │  └──────────────────────────────────────────────┘   │
        └──────────────┬──────────────────────────────┬────────┘
                       │                              │
              FastAPI :8000                    File System
              /chat /health                  logs/chat_analytics.jsonl
                       │
        ┌──────────────▼──────────────────┐
        │   AI Agent (FastAPI)             │
        │  services/ai-agent/              │
        │  ReAct Orchestrator + Tools      │
        │  FAISS RAG + Gemini LLM          │
        └─────────────────────────────────┘
```

> **Lưu ý:** Python AI service nằm trong `services/ai-agent/` (self-contained). Agent V2 bật qua `CHAT_AGENT_V2_ENABLED=true` trong `backend/.env`. Xem [Local demo quickstart](#local-demo-quickstart) và `docs/SMOKE_TEST_AI_AGENT.md`.

### Luồng hoạt động

```
User gửi câu hỏi
        │
        ▼
Express POST /chat/chatbot
        │
        ▼
Gọi Python FastAPI /chat
  • PhoBERT intent classification
  • Entity extraction (location, date, price)
  • Gemini LLM generate response
  • FAISS FAQ retrieval
        │
        ├─ "missing_info" → Trả lời hỏi thêm thông tin, KHÔNG truy vấn DB
        │
        ├─ "faq" → Trả lời FAQ, KHÔNG truy vấn DB
        │
        ├─ "partial_search" / "success"
        │     │
        │     ▼
        │  Truy vấn MSSQL (tour name, price, dates)
        │     │
        │     ▼
        │  Trả tour cards cho user
        │
        └─ Python unreachable → Fallback (HTTP 200, "AI hiện chưa phản hồi được")
              │
              ▼
        Ghi JSONL log (fire-and-forget)
```

### Chạy AI Agent cục bộ

**Bước 1:** Cấu hình `.env` (backend)

```bash
cd backend
cp .env.example .env
# Chỉnh sửa .env, thêm/bỏ comment:

CHAT_ANALYTICS_ENABLED=true
CHAT_ANALYTICS_LOG_PATH=logs/chat_analytics.jsonl
PYTHON_CHATBOT_URL=http://localhost:8000/chat
PYTHON_CHATBOT_TIMEOUT_MS=15000
# AI_SERVICE_URL=http://localhost:8000  # alias cho tương lai
```

**Bước 2:** Chạy AI Agent (Python FastAPI)

```bash
# Tạo và kích hoạt virtual environment
cd services/ai-agent
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate

# Cài đặt dependencies
pip install -r requirements.txt

# Cấu hình env
cp .env.example .env
# Điền GEMINI_API_KEY vào .env

# Khởi động AI Agent
uvicorn server:app --host 0.0.0.0 --port 8000 --reload
```

**Bước 3:** Chạy backend (port 3001) — terminal mới

```bash
cd backend
npm run dev
```

**Bước 4:** Chạy frontend (port 3000) — terminal mới

```bash
cd ..
npm run dev
```

**Bước 5:** Kiểm tra health endpoint

```bash
# Backend health (Express)
curl http://localhost:3001/api/health

# AI Agent health (FastAPI)
curl http://localhost:8000/health
# {"status":"ok","service":"travelweb-ai-agent",...}

# Chat health (Python + Express qua proxy)
curl http://localhost:3001/chat/health
# {"status":"ok"} = AI Agent hoạt động
# {"status":"degraded"} = AI Agent không kết nối được (vẫn hoạt động với fallback)
```

> **Roadmap:** Xem `docs/AI_AGENT_UPGRADE_PLAN.md` và `docs/PROJECT_PHASE_CHECKPOINT.md` cho các phase tiếp theo (Docker Compose, cloud deploy).

### Backend Endpoints

| Method | Endpoint | Mô tả |
|--------|----------|--------|
| `POST` | `/chat/chatbot` | Gửi câu hỏi → AI chatbot + DB tour search |
| `GET` | `/chat/health` | Health check: Python chatbot + Express |
| `GET` | `/chat/logs` | Danh sách event gần nhất (mặc định 50) |
| `GET` | `/chat/insights` | Tổng hợp: total, fallback, destinations... |

**POST /chat/chatbot**

```bash
curl -X POST http://localhost:3001/chat/chatbot \
  -H "Content-Type: application/json" \
  -d '{"query":"Tôi muốn đi Đà Lạt tháng 12 dưới 5 triệu","user_id":"user_123"}'
```

Response body (thuộc tính chính):

```json
{
  "status": "success",
  "message": "Em đã tìm được tour phù hợp.",
  "entities": {
    "location": "Đà Lạt",
    "destination_normalized": "da-lat",
    "date_start": "2026-12-01",
    "date_end": "2026-12-31",
    "price_max": 5000000
  },
  "tourlist": [ /* tour cards từ MSSQL */ ],
  "missing_fields": [],
  "search_metadata": {
    "query_intent": "cost_planning",
    "content_category": "tour_search",
    "faq_opportunity": false
  }
}
```

**GET /chat/insights**

```bash
curl http://localhost:3001/chat/insights
```

```json
{
  "total_chats": 40,
  "fallback_count": 8,
  "fallback_rate": 0.2,
  "status_distribution": { "success": 30, "missing_info": 10 },
  "top_destinations": [{ "destination": "Đà Lạt", "count": 6 }],
  "query_intent_distribution": { "find_tour_with_location": 15 },
  "content_category_distribution": { "tour_search": 30 },
  "faq_opportunities_count": 5,
  "no_result_searches": 3,
  "avg_latency_ms": 320,
  "recent_events": [ /* max 200 event gần nhất */ ]
}
```

### Giới hạn

- **MSSQL bắt buộc cho tour cards thực:** Endpoint `/chat/chatbot` vẫn trả lời được câu hỏi (qua Python chatbot) khi MSSQL chưa cấu hình, nhưng `tourlist` sẽ rỗng. Cần chạy `sql_createTable.sql` và `sql_dataEx.sql` để có dữ liệu tour thực.
- **JSONL analytics cho demo:** Log analytics dùng file JSONL cục bộ (`logs/chat_analytics.jsonl`), phù hợp cho môi trường phát triển/demo. Cho production, nên ghi thêm vào MSSQL hoặc dùng service log tập trung.
- **Auth cho /chat/insights:** Endpoint insights hiện không có auth. Trong production, cần thêm middleware xác thực (JWT/API key) để chỉ admin mới truy cập được.

---

## 5. Chạy ứng dụng (Development)

Sau khi đã cài đặt dependencies và cấu hình cơ sở dữ liệu, bạn cần **3 terminal** để chạy đầy đủ stack:

**Terminal 1 — AI Agent (Python FastAPI):**
```bash
cd services/ai-agent
source .venv/bin/activate
uvicorn server:app --host 0.0.0.0 --port 8000 --reload
```

**Terminal 2 — Backend (Express):**
```bash
cd backend
npm run dev
```

**Terminal 3 — Frontend (React):**
```bash
cd ..
npm run dev
```

Hoặc dùng script gốc (chỉ frontend + backend, chưa có AI Agent):
```bash
npm run dev  # chạy concurrently backend + frontend từ root package.json
```

**Truy cập ứng dụng:**
- Frontend: http://localhost:3000
- API Gateway: http://localhost:3001
- AI Agent: http://localhost:8000 (docs: http://localhost:8000/docs)

Thông tin đăng nhập Test
Sử dụng các tài khoản sau để kiểm tra các giao diện và chức năng khác nhau:

1. Giao diện Khách hàng
Tài khoản: nguyenvanan01@gmail.com

Mật khẩu: 111111B@

Hoặc có thể dùng đăng nhập bằng tài khoản google 

Để test chức năng thanh toán (VNPAY):
Chọn phương thức thanh toán vnpay và chọn thanh toán bằng thẻ nội địa. Sử dụng thông tin thẻ mẫu sau:

Ngân hàng: NCB
Số thẻ: 9704198526191432198
Tên chủ phát hành: NGUYEN VAN A
Ngày phát hành: 07/15
Mật khẩu OTP: 123456
2. Giao diện Admin
Có các tài khoản admin mẫu sau:

Tài khoản 1: nguyenvana@example.com

Mật khẩu 1: 111111B@

Tài khoản 2: thi.b@example.com

Mật khẩu 2: 111111B@

Tài khoản 3: van.c@example.com

Mật khẩu 3: 111111B@


