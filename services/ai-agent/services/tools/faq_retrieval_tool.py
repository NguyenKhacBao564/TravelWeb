"""
Tool: faq_retrieval

Wraps RetrievalPipeline for the Agent V2 tool registry (Phase 4A).
Uses the existing faq_index.faiss + faq_metadata.json for semantic FAQ retrieval.

Runtime dependency: pipelines.retrieval.RetrievalPipeline
"""
from __future__ import annotations

import logging
import os
import time
from typing import TYPE_CHECKING, Any, Optional

logger = logging.getLogger(__name__)

if TYPE_CHECKING:
    from pipelines.retrieval import RetrievalPipeline

# ---------------------------------------------------------------------------
# Runtime retrieval pipeline (lazy singleton)
# ---------------------------------------------------------------------------

_pipeline: Optional[Any] = None
_pipeline_init_error: Optional[str] = None


def _get_pipeline():
    """
    Lazily initialise and cache the RetrievalPipeline.

    Returns (pipeline, error_message):
      - On success: (RetrievalPipeline instance, None)
      - On failure:  (None, "index_missing" | "import_error" | str(exc))
    """
    global _pipeline, _pipeline_init_error
    if _pipeline is not None or _pipeline_init_error is not None:
        return _pipeline, _pipeline_init_error

    # Check files exist first
    base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    index_path = os.path.join(base_dir, "faq_index.faiss")
    metadata_path = os.path.join(base_dir, "faq_metadata.json")

    if not os.path.isfile(index_path):
        _pipeline_init_error = "index_missing"
        return None, _pipeline_init_error
    if not os.path.isfile(metadata_path):
        _pipeline_init_error = "index_missing"
        return None, _pipeline_init_error

    try:
        from pipelines.retrieval import RetrievalPipeline
        threshold = float(os.getenv("FAQ_DISTANCE_THRESHOLD", "12.0"))
        _pipeline = RetrievalPipeline(
            index_file=index_path,
            metadata_file=metadata_path,
            distance_threshold=threshold,
        )
        return _pipeline, None
    except ImportError as exc:
        _pipeline_init_error = f"import_error: {exc}"
        return None, _pipeline_init_error
    except Exception as exc:
        _pipeline_init_error = str(exc)
        return None, _pipeline_init_error


def faq_retrieval_tool(
    query: str,
    top_k: int = 5,
    request_id: Optional[str] = None,
    **kwargs,
) -> dict:
    """
    Retrieve FAQ entries for a general knowledge / service question.

    Parameters
    ----------
    query : str
        The user's question.
    top_k : int, default 5
        Maximum number of FAQ hits to return.
    request_id : str, optional
        Trace ID forwarded for logging.

    Returns
    -------
    dict
        Stable tool result shape::

        {
            "ok": True | False,
            "status": "success" | "no_results" | "error",
            "tool": "faq_retrieval",
            "message": "...",
            "hits": [
                {
                    "doc_id": "...",
                    "title": "...",
                    "snippet": "...",
                    "score": float|null,
                    "source": "..."
                }
            ],
            "error_type": null | "index_missing" | "import_error" | "retrieval_error" | "bad_query",
            "latency_ms": float
        }
    """
    start = time.monotonic()

    if not isinstance(query, str) or not query.strip():
        return {
            "ok": False,
            "status": "error",
            "tool": "faq_retrieval",
            "message": "Query must be a non-empty string.",
            "hits": [],
            "error_type": "bad_query",
            "latency_ms": round((time.monotonic() - start) * 1000, 1),
        }

    safe_top_k = max(1, min(int(top_k), 20))

    pipeline, error = _get_pipeline()

    if error == "index_missing":
        return {
            "ok": False,
            "status": "error",
            "tool": "faq_retrieval",
            "message": "FAQ index is not available on this server.",
            "hits": [],
            "error_type": "index_missing",
            "latency_ms": round((time.monotonic() - start) * 1000, 1),
        }

    if error is not None:
        return {
            "ok": False,
            "status": "error",
            "tool": "faq_retrieval",
            "message": f"FAQ retrieval is unavailable: {error}",
            "hits": [],
            "error_type": "import_error",
            "latency_ms": round((time.monotonic() - start) * 1000, 1),
        }

    try:
        sources = pipeline.retrieve(query.strip(), top_k=safe_top_k)

        if not sources:
            return {
                "ok": True,
                "status": "no_results",
                "tool": "faq_retrieval",
                "message": "Khong tim thay cau tra loi phu hop cho cau hoi nay.",
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
            }
            for idx, src in enumerate(sources)
        ]

        return {
            "ok": True,
            "status": "success",
            "tool": "faq_retrieval",
            "message": message,
            "hits": hits,
            "error_type": None,
            "latency_ms": round((time.monotonic() - start) * 1000, 1),
        }

    except Exception as exc:
        logger.warning("faq_retrieval_tool failed: %s", exc)
        return {
            "ok": False,
            "status": "error",
            "tool": "faq_retrieval",
            "message": "Da xay ra loi khi truy van FAQ.",
            "hits": [],
            "error_type": "retrieval_error",
            "latency_ms": round((time.monotonic() - start) * 1000, 1),
        }
