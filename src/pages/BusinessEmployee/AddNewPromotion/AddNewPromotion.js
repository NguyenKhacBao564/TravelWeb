import React, {useState, useEffect} from 'react';
import { Container, Row, Col, Button, Form, Alert } from 'react-bootstrap';
import PromotionBasicInfor from './PromotionBasicInfor';
import "./AddNewPromotion.scss"
import { useNavigate, useLocation } from 'react-router-dom';
import { IoMdArrowRoundBack } from "react-icons/io";
import { IoIosArrowBack } from "react-icons/io";
import generateId from '../../../feature/GenerateId';
import {createPromotion, updatePromotion} from '../../../api/promotionAPI';


function AddNewPromotion(props) {
    const location = useLocation();
    const navigate = useNavigate();

    // Kiểm tra xem có dữ liệu khuyến mãi từ trang trước không
    const promotionDetail = location.state?.promotionDetail || null;
    const isEditMode = !!promotionDetail; // Nếu có dữ liệu khuyến mãi thì là chế độ chỉnh sửa, ngược lại là thêm mới

    const [successMessage, setSuccessMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const [showSuccess, setShowSuccess] = useState(false);
    const [showError, setShowError] = useState(false);

    // Giá trị mặc định của form
    const initialValues = {
        promo_id: '',
        promo_name: '',
        code: '',
        discount_percentage: 0,
        start_date: '',
        end_date: '',
        max_use: 0,
    };

    const [values, setValues] = useState(initialValues);

    // Tự động ẩn thông báo sau 1 giây
    useEffect(() => {
        if (showSuccess || showError) {
            const timer = setTimeout(() => {
                setShowSuccess(false);
                setShowError(false);
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, [showSuccess, showError]);

    // Nếu là chế độ chỉnh sửa, thì set giá trị ban đầu từ promotionDetail
    useEffect(() => {
        if (!isEditMode || !promotionDetail) return;
        if (isEditMode) {
            setValues(prev => ({
                    ...prev,
                    ...promotionDetail,
            }));
            console.log("Promotion detail: ", promotionDetail);
        }
    }, [isEditMode, promotionDetail]);


    const handleSubmit = async (e) => {
        e.preventDefault();
        if (values.end_date < values.start_date) {
            setShowError(true);
            setErrorMessage('Ngày kết thúc không được trước ngày bắt đầu');
            return;
        }
        const promotionData = {
            ...values,
            promo_id: isEditMode? promotionDetail.promo_id : generateId(),
        }

        console.log("Promotion data: ", promotionData);
        try {
            if(isEditMode) {
                await updatePromotion(promotionData.promo_id, promotionData);
                setShowSuccess(true);
                setSuccessMessage('Cập nhật khuyến mãi thành công');
                return;
            }else {
                await createPromotion(promotionData);
                setShowSuccess(true);
                setSuccessMessage('Thêm khuyến mãi thành công');
                // Reset form về giá trị ban đầu
                setValues(initialValues);
                return;
            }
        }catch (error) {
            setShowError(true);
            setErrorMessage(error.response.data.message);
        }


    }

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setValues({...values, [name]: value});
    }

    const goBack = () => {
        navigate(-1);
    }

    return (
        <>
         <div className="alert-area" style={{ 
                position: 'fixed', 
                top: '50px', 
                right: '30%', 
                zIndex: 9999, 
                width: '600px' 
            }}>
            {showSuccess && <Alert variant="success" className="text-center">{successMessage}</Alert>}
            {showError && <Alert variant="danger" className="text-center">{errorMessage}</Alert>}
            </div>
            <div className="go-back d-flex align-items-center pb-3" >
                <IoIosArrowBack size={38} onClick={goBack} style={{cursor: 'pointer'}} />
                <h2 style={{color: '#339688', fontWeight: 'bold', margin: "0"}}>Thêm khuyến mãi mới</h2>
            </div>
            <Container fluid className="add-new-promotion py-4">
                <Form onSubmit={handleSubmit}>
                    <PromotionBasicInfor values={values} onChange={handleInputChange} />
                    <Button 
                        variant="success" 
                        className="mt-3 py-3 px-5" 
                        style={{display: "block"}} 
                        type="submit"
                    >Lưu</Button>
                </Form>
            </Container>
        </>
    );
}

export default AddNewPromotion;