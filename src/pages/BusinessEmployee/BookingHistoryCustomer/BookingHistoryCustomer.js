import React, {useEffect, useState} from 'react';
import './BookingHistoryCustomer.scss'; // Import your styles here
import { IoIosArrowRoundBack } from "react-icons/io";
import { useNavigate, useLocation } from 'react-router';
import { FaLocationDot } from "react-icons/fa6";
import { IoIosTime } from "react-icons/io";
import { FaRegCalendarAlt } from "react-icons/fa";
import { MdEventSeat } from "react-icons/md";
import { FaCar } from "react-icons/fa";
import { formatDate } from '../../../feature/formatDate';
import { getTourById } from '../../../api/tourAPI';
import { getHistoryBookingById } from '../../../api/historyBookingAPI';



function BookingHistoryCustomer() {

  const navigate = useNavigate();
  const location = useLocation();

  const bookingData = location.state?.booking || {};
  const customerData = location.state?.customer || {};

  console.log("Booking Data:", bookingData);
  console.log("Customer Data:", customerData);

  const [loading, setLoading] = useState(true);
  const [tour, setTour] = useState({});
  const [bookingDetail, setBookingDetail] = useState({});



  console.log("Booking Detail:", bookingDetail);

  //Lấy dữ liệu khi component được mount
  useEffect(() => {
    // Gọi backend để lấy thông tin chi tiết tour và booking theo id 
    const fetchData = async () => {
      setLoading(true);
      try {
        const dataTour = await getTourById(bookingData.tour_id);
        setTour(dataTour);
        const dataBooking = await getHistoryBookingById(bookingData.booking_id);
        setBookingDetail(dataBooking);
      } catch (error) {
        console.error("Error fetching tour data:", error);
      } finally {
        setLoading(false);
      }
    };

    if (bookingData.tour_id) {
      fetchData();
    }
  }, [bookingData.tour_id]);

  // console.log("price:", bookingDetail.adultPrice.quantity);

  const formatPrice = (price) => {
    return price.toLocaleString('vi-VN') + ' đ';
  };

  return (
    <div className="booking-history-customer">
      {/* Header */}
      <div className="flex align-items-center" onClick={() => navigate(-1)} style={{ cursor: 'pointer' }}>
        <IoIosArrowRoundBack />
        <p className="back-text"> Quay lại</p>
      </div>

      <div className="content">
        {/* Title */}
        <h1 className="title">{bookingData.tour_name}</h1>

        {/* Customer Info */}
        <div className="customer-info">
          <div className="info-row">
            <span className="label">Khách hàng: </span>
            <span>{customerData.fullname}</span>
          </div>
          <div className="info-row">
            <span className="label">Ngày đặt tour: </span>
            <span>{formatDate(bookingData.booking_date)}</span>
          </div>
          <div className="info-row">
            <span className="label">Mã booking: </span>
            <span>{bookingData.booking_id}</span>
          </div>
        </div>

        {/* Tour Information Card */}
        <div className="tour_info-card">
          <h2 className="tour_title">THÔNG TIN TOUR</h2>
          
          <div className="tour-grid">
            {/* Location */}
            <div className="info_item">
              {/* <MapPin className="icon green" /> */}
              <div className="info-content">
                <h3 className="info-label"><FaLocationDot/> Địa Điểm</h3>
                <p className="info-value">{tour.destination}</p>
              </div>
            </div>

            {/* Duration */}
            <div className="info_item">
              {/* <Clock className="icon blue" /> */}
              <div className="info-content">
                <h3 className="info-label"><IoIosTime/> Thời Lượng</h3>
                <p className="info-value">{tour.duration} ngày {tour.duration -1 } đêm</p>
              </div>
            </div>

            {/* Total Guests */}
            <div className="info_item">
              {/* <Users className="icon blue" /> */}
              <div className="info-content">
                <h3 className="info-label"><MdEventSeat/> Tổng Số Ghế</h3>
                <p className="info-value">{tour.max_guests}</p>
              </div>
            </div>

            {/* Transport */}
            <div className="info_item">
              {/* <Car className="icon green" /> */}
              <div className="info-content">
                <h3 className="info-label"><FaCar/> Phương Tiện</h3>
                <p className="info-value">{tour.transport}</p>
              </div>
            </div>

            {/* Departure Date */}
            <div className="info_item">
              {/* <Calendar className="icon blue" /> */}
              <div className="info-content">
                <h3 className="info-label"><FaRegCalendarAlt/> Ngày Khởi Hành</h3>
                <p className="info-value">{formatDate(tour.start_date)}</p>
              </div>
            </div>

            {/* Return Date */}
            <div className="info_item">
              {/* <CalendarCheck className="icon green" /> */}
              <div className="info-content">
                <h3 className="info-label"><FaRegCalendarAlt/> Ngày Về</h3>
                <p className="info-value">{formatDate(tour.end_date)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Pricing Section */}
        <div className="pricing-section">
          {/* Left side - Guest counts and prices */}
          {loading ? <p>Loading...</p> :
          <div className="pricing-left">
            <div className="pricing-row">
              <div className="pricing-label">
                <span className="label-text">Người lớn</span>
                <span className="quantity">x {bookingDetail.adultPrice.quantity} =</span>
              </div>
              <span className="price">{formatPrice(bookingDetail.adultPrice.total_price)}</span>
            </div>

            <div className="pricing-row">
              <div className="pricing-label">
                <span className="label-text">Trẻ em</span>
                <span className="quantity">x {bookingDetail.childPrice.quantity} =</span>
              </div>
              <span className="price">{formatPrice(bookingDetail.childPrice.total_price)}</span>
            </div>

            <div className="pricing-row">
              <div className="pricing-label">
                <span className="label-text">Em bé</span>
                <span className="quantity">x {bookingDetail.infantPrice.quantity} =</span>
              </div>
              <span className="price">{formatPrice(bookingDetail.infantPrice.total_price)}</span>
            </div>

            <div className="pricing-row total-border">
              <span className="label-text">Voucher</span>
              <span className="price">-{formatPrice(bookingDetail.voucher)}</span>
            </div>
          </div>
          }
  
          {/* Right side - Total */}
          <div className="pricing-right">
            <div className="total-container">
              <h3 className="total-label">Thành tiền:</h3>
              <p className="total-amount">{formatPrice(bookingData.total_price)}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default BookingHistoryCustomer;