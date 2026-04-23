import React, { useEffect, useState } from 'react';
import "./FilterTourCard.scss";
import { Container, Row, Col } from 'react-bootstrap';
import {provinceList} from "../../utils/provinceList"
import Dropdown from 'react-bootstrap/Dropdown';



function FilterTourCard(props) {

    const {submit, filterInfor} = props;

    const [values, setValues] = useState({
        name: '',
        budget: '',
        departure: '',
        destination: '',
        date: ''
    });

    console.log("FilterTourCard props: ", filterInfor);

    // Sử dụng useEffect để lấy các giá trị filter chọn từ trang chủ
    useEffect(() => {
        // Kiểm tra nếu filterInfor có giá trị, nếu có thì cập nhật state values
        if (filterInfor) {
            setValues({
                name: filterInfor.name || '', // Sử dụng giá trị tên từ filterInfor, nếu không có thì để trống
                budget: filterInfor.budget || '',  // Sử dụng giá trị ngân sách từ filterInfor, nếu không có thì để trống
                departure: '', //Không có giá trị khởi hành từ filterInfor
                destination: filterInfor.destination || '', // Không có giá trị điểm đến từ filterInfor
                date: filterInfor.date || '' // Sử dụng giá trị ngày từ filterInfor, nếu không có thì để trống
            });
        }
    },[filterInfor]);

    console.log("Value: ", values);
    const handleBudgetSelect = (budget) => {
        setValues({ ...values, budget: budget === values.budget ? '' : budget });
    };

    const handleValueChange = (field, value) => {
        setValues({ ...values, [field]: value });
    };

    const handleSubmit = () =>{
        // handleFilterChange(values);
        console.log("Submitted values:", values);
        submit(values); // Gọi hàm submit từ props để gửi dữ liệu lên component cha
        // Thực hiện các hành động khác khi người dùng nhấn nút "Áp Dụng"
    }

    console.log("selectedBudget:", values.budget);
    console.log("province:" ,provinceList);

    return (
        <Container className="filterTour_card">
            <Row>
                <h3>Bộ lọc tìm kiếm</h3>
            </Row>
            <Row className="filter-section">
                <Row>
                    <p>Ngân sách</p>
                </Row>
                <Row className="mx-auto">
                    <Col md={6} >
                        <Row>
                            <span
                                className={`budget-option ${values.budget === 'under-5m' ? 'selected' : ''}`}
                                name="under-5m"
                                value="under-5m"
                                onClick={() => handleBudgetSelect('under-5m')}
                            >
                                Dưới 5 Triệu
                            </span>
                        </Row>
                        <Row>
                            <span
                                className={`budget-option ${values.budget === '10m-20m' ? 'selected' : ''}`}
                                onClick={() => handleBudgetSelect('10m-20m')}
                            >
                                Từ 10 - 20 Triệu
                            </span>
                        </Row>
                    </Col>
                    <Col md={6}>
                        <Row>
                            <span
                                className={`budget-option ${values.budget === '5m-10m' ? 'selected' : ''}`}
                                onClick={() => handleBudgetSelect('5m-10m')}
                            >
                                Từ 5 - 10 Triệu
                            </span>
                        </Row>
                        <Row>
                            <span
                                className={`budget-option ${values.budget === 'over-20m' ? 'selected' : ''}`}
                                onClick={() => handleBudgetSelect('over-20m')}
                            >
                                Trên 20 Triệu
                            </span>
                        </Row>
                    </Col>
                </Row>
            </Row>
            <Row className="filter-section">
                <Row>
                    <span>Điểm Khởi Hành</span>
                </Row>
                <Row className="mx-auto">
                    <Dropdown  onSelect={(selected) => handleValueChange('departure', selected)}>
                        <Dropdown.Toggle >
                            {values.departure || "Tất cả"}
                        </Dropdown.Toggle>
                        <Dropdown.Menu className="custom-dropdown-menu">
                            {provinceList.map((province, index) => (
                            <Dropdown.Item key={index} eventKey={province.value}>
                                {province.value}
                            </Dropdown.Item>
                            ))}
                        </Dropdown.Menu>
                    </Dropdown>
                </Row>
            </Row>
            <Row className="filter-section">
                <Row>
                    <span>Điểm Đến</span>
                </Row>
                <Row className="mx-auto">
                    <Dropdown onSelect={(selected) => handleValueChange('destination', selected)}>
                        <Dropdown.Toggle variant="success" >
                             {values.destination || "Tất cả"}
                        </Dropdown.Toggle>
                        <Dropdown.Menu>
                            {provinceList.map((province, index) => (
                            <Dropdown.Item key={index} eventKey={province.value}>
                                {province.value}
                            </Dropdown.Item>
                            ))}
                        </Dropdown.Menu>
                    </Dropdown>
                </Row>
            </Row>
            <Row className="filter-section">
                <Row>
                    <span>Ngày Đi</span>
                </Row>
                <Row className="mx-auto">
                        <input type="date" className="date-input" 
                            value={values.date} 
                            onChange={(e) => handleValueChange('date', e.target.value)}
                        />
                </Row>
            </Row>
            <Row>
                <Col>
                    <button className="apply-button btn fz-16" onClick={handleSubmit}>Áp Dụng</button>
                </Col>
            </Row>
        </Container>
    );
}

export default FilterTourCard;