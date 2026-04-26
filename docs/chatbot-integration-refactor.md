# Chatbot Integration Contract

## Responsibility split

- Python chatbot service is responsible for NLP, intent detection, session/entity understanding, and deciding whether the user message is `missing_info`, `partial_search`, `success`, `no_results`, or `faq`.
- Express backend is responsible for calling the Python service, interpreting that structured response, querying MSSQL for real tours, and shaping the final `/chat/chatbot` API response.
- MSSQL data in this repository is the final source of truth for tours shown in the web app.

Python may return `tours`, but those are not treated as final business results. The Express layer always uses this repository's `Tour`, `Tour_Price`, and `Tour_image` tables for the rendered `tourlist`.

## `/chat/chatbot` response

The transitional response shape is:

```json
{
  "status": "partial_search",
  "message": "Mình đã tìm tour dựa trên thông tin hiện có của bạn.",
  "response": "Mình đã tìm tour dựa trên thông tin hiện có của bạn.",
  "missing_fields": ["price_max"],
  "entities": {
    "location": "Đà Lạt",
    "date_start": "2025-06-10",
    "date_end": "2025-06-15"
  },
  "tourlist": [],
  "faq_sources": []
}
```

Notes:

- `message` is the canonical chatbot text.
- `response` is kept temporarily for frontend backward compatibility.
- `tourlist` always comes from MSSQL, never from Python `tours`.
- `faq_sources` is optional and only returned when Python provides it.

## Status handling

- `missing_info`: return chatbot guidance only, do not query MSSQL.
- `faq`: return chatbot answer only, do not query MSSQL.
- `partial_search`: query MSSQL with whatever normalized filters are available, keep status as `partial_search`.
- `success`: this is only final if MSSQL returns tours.
- `no_results`: final result after a full-search DB lookup returns no real tours.

For full-search flows, Python can identify that the request is complete, but Express still decides the final business outcome from MSSQL:

- DB has tours => final `status = "success"`
- DB has no tours => final `status = "no_results"`

## Chat-driven DB search

Normalized chatbot entities currently supported:

- `location`
- `destination_normalized`
- `date_start`
- `date_end`
- `price_min`
- `price_max`

Those are mapped into a deterministic MSSQL query over user-visible tours:

- `Tour.status IN ('active', 'upcoming')`
- `Tour_Price.age_group = 'adultPrice'`
- location search on `Tour.destination` and `Tour.name`
- start-date range on `Tour.start_date`
- price range on `Tour_Price.price`
- results ordered by `start_date`, then `price`, then `created_at`

Returned tour rows include the fields the current frontend already understands, including `tour_id`, `name`, `destination`, `start_date`, `end_date`, `duration`, `price`, `prices`, `cover_image`, `max_guests`, and `booked_slots`.

## Verification

Automated backend checks were added in [backend/tests/chatIntegration.test.js](/Users/nguyen_bao/Documents/PTIT/Junior_2/cnpm/tour-booking-web/backend/tests/chatIntegration.test.js):

1. `missing_info` preserves the message and returns no tours.
2. `faq` does not trigger DB search.
3. `partial_search` with location plus time keeps partial status and returns DB tours.
4. Query builder supports location plus price search.
5. Full-search uses DB results to determine `success`.
6. Python sample `tours` are ignored when DB is empty, resulting in `no_results`.

Manual smoke scenarios to run against the live stack:

1. Ask an underspecified tour question and confirm `status = missing_info`, `tourlist = []`.
2. Ask an FAQ-style question and confirm `status = faq`, `tourlist = []`.
3. Ask for a tour with destination plus date range and confirm `status = partial_search` or `success` with MSSQL tours.
4. Ask for a tour with destination plus budget and confirm price filtering is applied from MSSQL.
5. Ask for a fully specified tour query that has no real DB matches and confirm the final status is `no_results`.
