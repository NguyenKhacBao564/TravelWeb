import React, { useState, useContext } from 'react';
import { Form, Button, InputGroup, Image } from 'react-bootstrap';
import './ReviewFilter.scss';
import {API_URL} from '../../utils/API_Port';
import generateId from '../../feature/GenerateId';
import { AuthContext } from '../../context/AuthContext';
import { addReview} from '../../api/reviewAPI';


function ReviewFilter(props) {
  const { tour_id } = props;
  console.log("Tour ID in ReviewFilter:", tour_id);
  const { user, loading } = useContext(AuthContext);

  const [values, setValues] = useState({
    content: '',
    rating: 0,
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setValues((prevValues) => ({
      ...prevValues,
      [name]: value,
    }));
    console.log("Input changed:", values);
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!values.content || values.rating === 0) {
      alert('Vui lòng nhập đầy đủ nội dung và chọn số sao!');
      return;
    }

    if (!user) {
      alert('Bạn cần đăng nhập để gửi đánh giá!');
      return;
    }

    const newReview = {
      review_id: generateId(),
      cus_id: user.id,
      tour_id: tour_id,
      comment: values.content,
      rating: values.rating,
    };

    await addReview(tour_id, newReview)
      .then(() => {
        alert('Đánh giá đã được gửi thành công!');
        setValues({
          content: '',
          rating: 0,
        });
      })
      .catch((error) => {
        console.error("Error adding review:", error);
        alert('Đã có lỗi xảy ra. Vui lòng thử lại sau.');
      });
  };


    // Ở đây bạn có thể thêm logic để gửi newReview đến server hoặc cập nhật state của reviews trong ReviewSection

    // Reset form
   console.log("Review submitted:", values);

  return (
    <div className="review-filter">
      { loading ? (
        <div className="loading-spinner">Loading...</div>
      ) : (
        <Form onSubmit={handleSubmit}>
          <div className="review-input-header">
            <Image
              src={user?.avatar  ? `${API_URL}/${user.avatar}` : `/default-avatar.jpg`}
              roundedCircle
              className="user-avatar"
            />
            <span>{user ? user.name : 'Khách'}</span>
          </div>
          <Form.Group className="mb-3">
          <Form.Control
            as="textarea"
            rows={4}
            placeholder="Chia sẻ trải nghiệm của bạn..."
            value={values.content}
            name="content"
            onChange={handleInputChange}
          />
        </Form.Group>
        <div className="rating-stars">
          {[1, 2, 3, 4, 5].map((star) => (
            <span
              key={star}
              className={`star ${star <= (values.rating) ? 'filled' : ''}`}
              onClick={() => setValues((prevValues) => ({ ...prevValues, rating: star }))}
            >
              ★
            </span>
          ))}
        </div>
        <Button variant="primary" type="submit" className="submit-btn">
          Gửi đánh giá
        </Button>
      </Form>)}
    </div>
  );
}

export default ReviewFilter;

















// import React from 'react';
// import "./ReviewFilter.scss"
// import Container from 'react-bootstrap/Container';
// import DropDownButton from '../Common/DropDown/DropDownButton';
// import SearchFilter from '../Common/SearchFilter/SearchFilter';
// import { CiFilter } from "react-icons/ci";

// function ReviewFilter(props) {
//     const sortItem = [
//         {name: "Mới nhất"},
//         {name: "Cũ nhất"},
//     ]

//     const filterItem = [
//         {name: "Tất cả"},
//         {name: "5 sao"},
//         {name: "4 sao"},
//         {name: "3 sao"},
//         {name: "2 sao"},
//         {name: "1 sao"},
//     ]

//     return (
//         <Container className='review-filter d-flex gap-3'>
//             <div className='filter-icon d-flex align-items-center gap-1'> 
//                 <CiFilter />
//                 <span>Lọc</span>
//             </div>
//             <div className='sort-btn d-flex align-items-center gap-1'>
//                 <DropDownButton title="Sắp xếp" dropitem={sortItem} />
//             </div>
//             <div className='filter-btn d-flex align-items-center gap-1'>
//                 <DropDownButton title="Lọc" dropitem={filterItem} />
//             </div>
//             <div className='search-area d-flex align-items-center gap-1'>
//                 <SearchFilter placeholder="Tìm kiếm ở đây" />
//             </div>
//         </Container>
//     );
// }

// export default ReviewFilter;