"""
Tool: booking_policy_lookup

Wraps RetrievalPipeline for booking/cancellation/payment policy questions (Phase 4A).
Reuses faq_index.faiss + faq_metadata.json with keyword-based policy category detection.

Runtime dependency: pipelines.retrieval.RetrievalPipeline
"""
from __future__ import annotations

import logging
import time
from typing import Optional

from services.entity_normalizer import slugify_vietnamese

logger = logging.getLogger(__name__)

# Keyword patterns per policy category (slugified Vietnamese tokens)
_POLICY_CATEGORY_PATTERNS: dict[str, set[str]] = {
    "cancellation": {
        "huy-tour", "huy-ve", "doi-lich", "thay-doi-lich", "thay-doi", "huy-dich-vu",
    },
    "refund": {
        "hoan-tien", "hoan-phi", "refund", "tra-lai",
    },
    "payment": {
        "thanh-toan", "vnpay", "momo", "dat-coc", "tra-gop", "chuyen-khoan", "tien-mat",
    },
    "booking": {
        "dat-tour", "book-tour", "dieu-khoan", "chinh-sach", "quy-dinh", "hop-dong",
    },
    "documents": {
        "giay-to", "ho-chieu", "visa", "passport", "cmnd", "cccd", "giay-phep",
    },
    "support": {
        "ho-tro", "lien-he", "tu-van", "hotline", "khieu-nai", "phan-hoi",
    },
}

_POLICY_TAG_KEYWORDS: dict[str, set[str]] = {
    "cancellation": {"huy", "doi-lich", "thay-doi"},
    "refund": {"hoan-tien", "hoan-phi"},
    "payment": {"thanh-toan", "vnpay", "momo", "dat-coc"},
    "booking": {"dat-tour", "dieu-khoan", "chinh-sach"},
    "documents": {"giay-to", "ho-chieu", "visa"},
    "support": {"ho-tro", "lien-he", "tu-van"},
}


def detect_policy_category(query: str) -> str:
    """
    Detect the most likely policy category from a user query.

    Uses slugified keyword matching — explicit and testable.
    Returns one of: cancellation, refund, payment, booking, documents, support, general.
    """
    slug = slugify_vietnamese(query) or ""
    if not slug:
        return "general"

    scores: dict[str, int] = {}
    for category, patterns in _POLICY_CATEGORY_PATTERNS.items():
        scores[category] = sum(1 for p in patterns if p in slug)

    best_category, best_score = max(scores.items(), key=lambda item: item[1])
    if best_score > 0:
        return best_category
    return "general"


def _hit_matches_category(tags: list, category: str) -> bool:
    """Return True if FAQ tags suggest the hit belongs to the detected category."""
    if category == "general":
        return True
    tag_slug = slugify_vietnamese(" ".join(tags)) if tags else ""
    keywords = _POLICY_TAG_KEYWORDS.get(category, set())
    return any(kw in tag_slug for kw in keywords) if tag_slug else True


def booking_policy_lookup_tool(
    query: str,
    top_k: int = 5,
    request_id: Optional[str] = None,
    **kwargs,
) -> dict:
    """
    Look up booking/cancellation/payment policy answers from the FAQ index.

    Returns a stable dict with policy_category and filtered hits.
    """
    start = time.monotonic()

    if not isinstance(query, str) or not query.strip():
        return {
            "ok": False,
            "status": "error",
            "tool": "booking_policy_lookup",
            "policy_category": "general",
            "message": "Query must be a non-empty string.",
            "hits": [],
            "error_type": "bad_query",
            "latency_ms": round((time.monotonic() - start) * 1000, 1),
        }

    safe_top_k = max(1, min(int(top_k), 20))
    policy_category = detect_policy_category(query.strip())

    # Reuse the shared FAQ retrieval pipeline
    from services.tools.faq_retrieval_tool import _get_pipeline

    pipeline, error = _get_pipeline()

    if error == "index_missing":
        return {
            "ok": False,
            "status": "error",
            "tool": "booking_policy_lookup",
            "policy_category": policy_category,
            "message": "FAQ index is not available on this server.",
            "hits": [],
            "error_type": "index_missing",
            "latency_ms": round((time.monotonic() - start) * 1000, 1),
        }

    if error is not None:
        return {
            "ok": False,
            "status": "error",
            "tool": "booking_policy_lookup",
            "policy_category": policy_category,
            "message": f"Policy lookup is unavailable: {error}",
            "hits": [],
            "error_type": "import_error",
            "latency_ms": round((time.monotonic() - start) * 1000, 1),
        }

    try:
        # Retrieve extra candidates, then prefer category-matching hits
        sources = pipeline.retrieve(query.strip(), top_k=safe_top_k * 2)

        if policy_category != "general":
            filtered = [s for s in sources if _hit_matches_category(s.tags or [], policy_category)]
            if filtered:
                sources = filtered[:safe_top_k]
            else:
                sources = sources[:safe_top_k]
        else:
            sources = sources[:safe_top_k]

        if not sources:
            return {
                "ok": True,
                "status": "no_results",
                "tool": "booking_policy_lookup",
                "policy_category": policy_category,
                "message": "Khong tim thay chinh sach phu hop cho cau hoi nay.",
                "hits": [],
                "error_type": None,
                "latency_ms": round((time.monotonic() - start) * 1000, 1),
            }

        top_answer = sources[0].answer or ""
        message = top_answer[:300] + ("..." if len(top_answer) > 300 else "")

        hits = [
            {
                "doc_id": str(idx),
                "title": src.question or "",
                "snippet": src.answer or "",
                "score": src.score,
                "source": src.source or "faq",
                "tags": src.tags or [],
            }
            for idx, src in enumerate(sources)
        ]

        return {
            "ok": True,
            "status": "success",
            "tool": "booking_policy_lookup",
            "policy_category": policy_category,
            "message": message,
            "hits": hits,
            "error_type": None,
            "latency_ms": round((time.monotonic() - start) * 1000, 1),
        }

    except Exception as exc:
        logger.warning("booking_policy_lookup_tool failed: %s", exc)
        return {
            "ok": False,
            "status": "error",
            "tool": "booking_policy_lookup",
            "policy_category": policy_category,
            "message": "Da xay ra loi khi truy van chinh sach.",
            "hits": [],
            "error_type": "retrieval_error",
            "latency_ms": round((time.monotonic() - start) * 1000, 1),
        }
