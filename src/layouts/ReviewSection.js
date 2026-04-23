import React, { useEffect, useState } from 'react';
import '../styles/layouts/ReviewSection.scss';
import Container from 'react-bootstrap/Container';
import ReviewFilter from '../components/ReviewFilter/ReviewFilter';
import ReviewItem from '../components/ReviewItem/ReviewItem';
import { getReviewList } from '../api/reviewAPI';


function ReviewSection(props) {
  const { tour_id, num_reviews, avg_rating } = props;
  const [reviews, setReviews] = useState([]);

  const [hasMore, setHasMore] = useState(true); // Kiểm tra còn bình luận để tải không
  const [page, setPage] = useState(1); //Các đánh giá sẽ được phân trang, mỗi trang sẽ hiển thị 5 đánh giá

  const limit = 5; // Số lượng đánh giá mỗi trang
  
  useEffect(() => {
    const fetchReviews = async () => {
      try {
        const response = await getReviewList(tour_id, page, limit);
        setReviews(prev => page === 1 ? response : [...prev, ...response]);
        setHasMore(response.length === limit);
        console.log("Fetched reviews: ", response);
      } catch (error) {
        console.error("Error fetching reviews:", error);
      }
    };

    fetchReviews();
    console.log("reviews: ", reviews);
  }, [tour_id, page]);

  const handleLoadMore = () => {
    setPage(prev => prev + 1); // Tăng trang để tải thêm bình luận
  };

  return (
    <Container className="review-section">
      <div className="review-header">
       
        <div className="review-score">
          <span className="score">{avg_rating}</span>
          <span className="count">({num_reviews} đánh giá)</span>
        </div>
        <div className="stars">
          {[1,2,3,4,5].map(i => (
            <span key={i} className={i <= avg_rating ? "star filled" : "star"}>★</span>
          ))}
        </div>
      </div>
        <ReviewFilter tour_id={tour_id} />

      <div className="review-list">
        {reviews.map(r => (
          <ReviewItem key={r.review_id} review={r}/>
        ))}
      </div>
      {hasMore && (
        <h5 className="extend-review text-center" onClick={handleLoadMore}>
          Xem thêm nhận xét
        </h5>
      )}


    </Container>
  );
}

export default ReviewSection;