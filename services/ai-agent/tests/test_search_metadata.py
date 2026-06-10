from services.search_metadata import (
    build_search_metadata,
    classify_query_intent,
    extract_related_keywords,
)


def test_classifies_cost_planning_query():
    assert classify_query_intent("Tour Đà Lạt dưới 5 triệu có không?") == "cost_planning"


def test_classifies_booking_policy_query():
    assert classify_query_intent("Nếu hủy tour thì hoàn tiền thế nào?") == "booking_policy"


def test_extracts_related_keywords_without_common_stopwords():
    keywords = extract_related_keywords("Tôi muốn đi Đà Lạt tháng 12 khoảng 5 triệu")

    assert "dalat" in "".join(keywords) or "lat" in keywords
    assert "muon" not in keywords


def test_build_search_metadata_marks_faq_opportunity():
    metadata = build_search_metadata("Trẻ em đi tour có cần mua vé không?", status="faq")

    assert metadata["faq_opportunity"] is True
    assert metadata["content_category"] == "faq_content"

