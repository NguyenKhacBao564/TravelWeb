from __future__ import annotations

from collections import Counter

from services.entity_normalizer import slugify_vietnamese


INTENT_PATTERNS = {
    "destination_discovery": {
        "di-dau",
        "nen-di",
        "co-gi",
        "choi-gi",
        "tham-quan",
        "dia-diem",
        "check-in",
    },
    "cost_planning": {
        "gia",
        "chi-phi",
        "bao-nhieu-tien",
        "ngan-sach",
        "trieu",
        "gia-re",
        "duoi",
    },
    "itinerary_planning": {
        "lich-trinh",
        "may-ngay",
        "ngay-dem",
        "thang",
        "khoi-hanh",
        "thoi-gian",
    },
    "travel_requirements": {
        "mac-gi",
        "mang-gi",
        "chuan-bi",
        "thoi-tiet",
        "visa",
        "ho-chieu",
        "tre-em",
    },
    "booking_policy": {
        "huy-tour",
        "doi-lich",
        "hoan-tien",
        "thanh-toan",
        "dat-coc",
        "bao-hiem",
    },
    "tour_search": {
        "tour",
        "dat-tour",
        "book-tour",
        "tim-tour",
        "co-tour",
        "tu-van-tour",
    },
}

STOPWORDS = {
    "toi",
    "minh",
    "em",
    "anh",
    "chi",
    "ban",
    "muon",
    "can",
    "cho",
    "hoi",
    "co",
    "khong",
    "duoc",
    "la",
    "ve",
    "di",
    "du",
    "lich",
    "voi",
    "vao",
    "trong",
    "mot",
    "nhung",
    "cac",
    "nao",
    "gi",
}


def classify_query_intent(query: str) -> str:
    query_slug = slugify_vietnamese(query) or ""
    scores = {}
    for intent, patterns in INTENT_PATTERNS.items():
        scores[intent] = sum(1 for pattern in patterns if pattern in query_slug)

    best_intent, best_score = max(scores.items(), key=lambda item: item[1])
    if best_score == 0:
        return "general_travel_question"
    return best_intent


def extract_related_keywords(query: str, limit: int = 6) -> list[str]:
    query_slug = slugify_vietnamese(query) or ""
    tokens = [
        token
        for token in query_slug.split("-")
        if len(token) >= 3 and token not in STOPWORDS and not token.isdigit()
    ]
    counts = Counter(tokens)
    return [token for token, _ in counts.most_common(limit)]


def infer_content_category(status: str, query_intent: str, has_tours: bool) -> str:
    if has_tours or status in {"success", "partial_search", "no_results", "missing_info"}:
        return "tour_search"
    if query_intent in {"travel_requirements", "booking_policy"}:
        return "faq_content"
    if query_intent == "destination_discovery":
        return "destination_guide"
    if query_intent == "cost_planning":
        return "pricing_content"
    if query_intent == "itinerary_planning":
        return "itinerary_content"
    return "travel_faq"


def build_search_metadata(query: str, status: str, has_tours: bool = False) -> dict:
    query_intent = classify_query_intent(query)
    related_keywords = extract_related_keywords(query)
    return {
        "query_intent": query_intent,
        "related_keywords": related_keywords,
        "content_category": infer_content_category(status, query_intent, has_tours),
        "faq_opportunity": status == "faq" or query_intent in {"travel_requirements", "booking_policy"},
    }
