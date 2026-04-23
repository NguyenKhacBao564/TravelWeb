import React from 'react';
import "./ReviewItem.scss"
import {API_URL} from "../../utils/API_Port";
import {formatDate} from "../../feature/formatDate";


function ReviewItem(props) {
    const {review} = props
    console.log("review: ", review)
    
    return (
        <div className="review-item" key={review.id}>
            <img className="avatar" src={review.avatar ? `${API_URL}/${review.avatar}` : '/default-avatar.jpg'} alt={review.name} />
            <div className="review-content">
                <div className="review-info">
                    <span className="name">{review.name}</span>
                    <span className="date">{formatDate(review.review_date)}</span>

                </div>
                <div><span className="stars">
                    {[1,2,3,4,5].map(i => (
                        <span key={i} className={i <= review.rating ? "star filled" : "star"}>★</span>
                    ))}
                    </span>
                </div>
                <div className="review-text">{review.comment}</div>
            </div>
          </div>
    );
}

export default ReviewItem;