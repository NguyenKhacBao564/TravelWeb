from typing import List, Literal, Optional

from pydantic import BaseModel, Field

from schemas.tour_models import ExtractedEntities, Tour


class FAQSource(BaseModel):
    question: Optional[str] = None
    answer: Optional[str] = None
    tags: List[str] = Field(default_factory=list)
    score: Optional[float] = None
    source: Optional[str] = None


class SearchMetadata(BaseModel):
    query_intent: str
    related_keywords: List[str] = Field(default_factory=list)
    content_category: str
    faq_opportunity: bool = False


class ChatResponse(BaseModel):
    status: Literal["missing_info", "partial_search", "success", "no_results", "faq"]
    message: str
    entities: ExtractedEntities
    missing_fields: List[str] = Field(default_factory=list)
    tours: List[Tour] = Field(default_factory=list)
    faq_sources: List[FAQSource] = Field(default_factory=list)
    search_metadata: Optional[SearchMetadata] = None
