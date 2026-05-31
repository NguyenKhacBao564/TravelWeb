# Tên dự án: Ứng dụng Quản lý Tour Du lịch

Đây là hướng dẫn thiết lập và chạy dự án này.

---

## Mục lục

1. [Yêu cầu hệ thống](#yêu-cầu-hệ-thống)
2. [Cài đặt dự án](#cài-đặt-dự-án)
3. [AI Chatbot Tích hợp](#ai-chatbot-tích-hợp)
   - [Kiến trúc](#kiến-trúc)
   - [Luồng hoạt động](#luồng-hoạt-động)
   - [Chạy AI Chatbot cục bộ](#chạy-ai-chatbot-cục-bộ)
   - [Backend Endpoints](#backend-endpoints)
   - [Giới hạn](#giới-hạn)
4. [Chạy ứng dụng](#chạy-ứng-dụng)
5. [Thông tin đăng nhập Test](#thông-tin-đăng-nhập-test)

---

## Yêu cầu hệ thống

Trước khi bắt đầu, hãy đảm bảo bạn đã cài đặt các công cụ sau:

* Node.js (phiên bản 18 trở lên được khuyến nghị)
* npm (thường đi kèm với Node.js)
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
        │   Python Chatbot (FastAPI)       │
        │  PhoBERT → Gemini LLM → FAISS   │
        │  Intent / Entity extraction      │
        └─────────────────────────────────┘
```

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

### Chạy AI Chatbot cục bộ

**Bước 1:** Cấu hình `.env` (backend)

```bash
cd backend
cp .env.example .env
# Chỉnh sửa .env, thêm/bỏ comment:

CHAT_ANALYTICS_ENABLED=true
CHAT_ANALYTICS_LOG_PATH=logs/chat_analytics.jsonl
PYTHON_CHATBOT_URL=http://localhost:8000/chat
PYTHON_CHATBOT_TIMEOUT_MS=15000
```

**Bước 2:** Chạy Python chatbot

```bash
# Chatbot source: ../AI_Project/Chatbot_AI/
cd ../AI_Project/Chatbot_AI
uvicorn server:app --host 0.0.0.0 --port 8000
```

**Bước 3:** Chạy backend (port 3001)

```bash
cd backend
npm run dev
```

**Bước 4:** Mở frontend (port 3000)

```bash
cd ..
npm run dev
```

**Bước 5:** Kiểm tra health endpoint

```bash
# Backend health (Express)
curl http://localhost:3001/api/health

# Chatbot health (Python + Express)
curl http://localhost:3001/chat/health
# {"status":"ok"} = Python hoạt động
# {"status":"degraded"} = Python không kết nối được (vẫn hoạt động với fallback)
```

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

## 3. Chạy ứng dụng
Sau khi đã cài đặt dependencies và cấu hình cơ sở dữ liệu, bạn có thể khởi động ứng dụng:

Mở terminal/command prompt, điều hướng đến thư mục gốc của dự án và chạy: npm run dev

Thao tác này sẽ khởi động cả phần backend và frontend của ứng dụng.

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


