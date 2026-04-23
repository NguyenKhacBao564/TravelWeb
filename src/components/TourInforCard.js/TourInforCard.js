import React from 'react';
import { Container, Row, Col } from 'react-bootstrap';
import "./TourInforCard.scss";
import Card from 'react-bootstrap/Card';
import { FaLocationDot } from "react-icons/fa6";
import { IoIosTime } from "react-icons/io";
import { FaRegCalendarAlt } from "react-icons/fa";
import { MdEventSeat } from "react-icons/md";
import { FaCar } from "react-icons/fa";
import {formatDate} from "../../feature/formatDate";
import { formatPrice } from '../../feature/formatPrice';

function TourInforCard(props) {
   
    const {tour} = props;

    // const adultPrice = tourPrices.find(item => item.age_group === 'adultPrice');
    // const childPrice = tourPrices.find(item => item.age_group === 'childPrice')?.price || '0';
    // const infantPrice = tourPrices.find(item => item.age_group === 'infantPrice')?.price || '0';


    return (
        <Card className="tourInforCard">
             <Container className="p-3 mb-4">
                <h3 className="text-center">THÔNG TIN TOUR</h3>
                <Row className="ps-5">
                    <Col md={{span: 4, offset: 0}}>
                        <Row className="mb-4">
                            <Col md={1} className="tour__infor--icon"><FaLocationDot/> </Col>
                            <Col className="tour_infor">
                                <p><strong>Địa Điểm:</strong></p>
                                <p>{tour.destination}</p>
                            </Col>
                        </Row>
                        <Row>
                            <Col md={1} className="tour__infor--icon"><FaCar/> </Col>
                            <Col className="tour_infor">
                                <p><strong>Phương Tiện:</strong></p>
                                <p>{tour.transport}</p>
                            </Col>
                        </Row>
                    </Col>
                    <Col md={{span: 4, offset: 0}}>
                        <Row className="mb-4">
                            <Col md={1} className="tour__infor--icon"><IoIosTime/></Col>
                            <Col className="tour_infor">
                                <p><strong>Thời Lượng:</strong></p>
                                <p>{tour.duration} ngày {tour.duration - 1} đêm</p>
                            </Col>
                        </Row>
                        <Row>
                            <Col md={1} className="tour__infor--icon"><FaRegCalendarAlt/></Col>
                            <Col className="tour_infor">
                                <p><strong>Ngày Khởi Hành:</strong></p>
                                <p>{formatDate(tour.start_date)}</p>
                            </Col>
                        </Row>
                    </Col>
                    <Col md={{span: 3, offset: 0}}>
                        <Row className="mb-4">
                            <Col md={1} className="tour__infor--icon"><MdEventSeat/></Col>
                            <Col className="tour_infor">
                                <p><strong>Chỗ Còn Trống:</strong></p>
                                <p>{tour.max_guests - tour.booked_slots}</p>
                            </Col>
                        </Row>
                        <Row>
                            <Col md={1} className="tour__infor--icon"><FaRegCalendarAlt/></Col>
                            <Col className="tour_infor">
                                <p><strong>Ngày Trở Về:</strong></p>
                                <p>{formatDate(tour.end_date)}</p>
                            </Col>
                        </Row>
                    </Col>
                </Row>
            </Container>
            {/* Đường phân chia */}
            <hr className="divider-horizon" />
            {/* Thông tin giá */}
            <Container className="price_infor p-3 mb-4">
                <h3 className="text-center">THÔNG TIN GIÁ</h3>
                <Row>
                    <Col md={{span:5, offset: 1}}>
                        <Row className="flex-center mb-4">
                            <Col className="ageGroup__label">
                                <p><strong>Người lớn</strong></p>
                                <p>(Từ 12 tuổi trở lên)</p>
                            </Col>
                            <Col><p className="price">{formatPrice(tour.adultPrice)}</p></Col>
                        </Row>
                        <Row className="flex ">
                            <Col className="ageGroup__label">
                                <p><strong>Trẻ em:</strong></p>
                                <p>(Từ 4 - 11 tuổi)</p>
                            </Col>
                            <Col><p className="price">{formatPrice(tour.childPrice)}</p></Col>
                        </Row>
                    </Col>
                    <Col md="auto" className="flex-center">
                        <hr className="divider-vertical"></hr>
                    </Col>
                    <Col md={{span:5, offset: 0}}>
                        <Row>
                             <Col className="ageGroup__label">
                                <p><strong>Em bé:</strong></p>
                                <p>(Dưới 4 tuổi)</p>
                            </Col>
                            <Col><p className="price">{formatPrice(tour.infantPrice)}</p></Col>
                        </Row>
                    </Col>
                </Row>
            </Container>
        </Card>
    );
}

export default TourInforCard;