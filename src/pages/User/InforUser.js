import React, {useContext, useState, useEffect} from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../../layouts/Navbar';
import Footer from '../../layouts/Footer';
import "../../styles/pages/InforUser.scss"
import Form from 'react-bootstrap/Form';
import Container from 'react-bootstrap/Container';
import Button from 'react-bootstrap/Button';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import { Link } from 'react-router-dom';
import UserAvatar from '../../components/Common/UserAvatar/UserAvatar';
import { FaArrowLeft } from "react-icons/fa6";
import { Alert } from 'react-bootstrap';
import { AuthContext } from '../../context/AuthContext';
import { updateCustomer } from '../../api/customerAccountAPI';
import Image from 'react-bootstrap/Image';
import { API_URL } from '../../utils/API_Port';

function InforUser(props) {
    const { user, logout, refreshUserData, loading } = useContext(AuthContext);
    const navigate = useNavigate();
    const [values, setValues] = useState({
        name: '',
        phone: '',
        address: '',
        image: null
    });

    const [image, setImage] = useState(null);
    const [displayImage, setDisplayImage] = useState(null);
    const [updateMessage, setUpdateMessage] = useState(null);
    
    // Kiểm tra đăng nhập và chuyển hướng nếu chưa đăng nhập
    useEffect(() => {
        if (!loading && !user) {
            navigate('/login', { state: { returnUrl: '/thongtin' } });
        }
    }, [user, loading, navigate]);
    
    // Cập nhật giá trị values khi user được tải
    useEffect(() => {
        if (user) {
            setValues({
                name: user.name || '',
                phone: user.phone || '',
                address: user.address || '',
                image: user.avatar || null
            });
        }
    }, [user]);
    
    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            setImage(file);
            // Revoke previous URL to prevent memory leaks
            if (displayImage) {
                URL.revokeObjectURL(displayImage);
            }
            setDisplayImage(URL.createObjectURL(file));
        }
    }

    const handleUpdate = async () => {
        try{
            const formData = {
                name: values.name,
                phone: values.phone,
                address: values.address,
                image: image || null
            }
            
        
            await updateCustomer(user.id, formData);
            setUpdateMessage("Cập nhật thông tin thành công");
            console.log("đợi refresh!")
            // Làm mới thông tin người dùng từ context
            await refreshUserData();
            
            // Xóa ảnh tạm và đặt lại state image
            if (displayImage) {
                URL.revokeObjectURL(displayImage);
            }
            setDisplayImage(null);
            setImage(null);
        }catch(error){
            setUpdateMessage("Lỗi khi cập nhật: " + error.message);
            console.log("error: ", error);
        }
    }

    // Hiển thị loading khi đang tải
    if (loading) {
        return (
            <div className='inforUser_page'>
                <Navbar/>
                <div className='container-infor d-flex justify-content-center align-items-center' style={{minHeight: '70vh'}}>
                    <div className="spinner-border text-primary" role="status">
                        <span className="visually-hidden">Đang tải...</span>
                    </div>
                </div>
                <Footer/>
            </div>
        );
    }

    // If user is null or undefined, show a loading state
    if (!user) {
        return (
            <div className='inforUser_page'>
                <Navbar/>
                <div className='container-infor'>
                    <h1 className="profile-title">Thông tin người dùng không khả dụng</h1>
                    <Link to="/" className="back-link">
                        <FaArrowLeft /> Quay lại trang chủ
                    </Link>
                </div>
                <Footer/>
            </div>
        );
    }

    const handleChange = (e) => {
        const {name, value} = e.target;
        setValues({...values, [name]: value});
    }
    
    return (
        <div className='inforUser_page'>
            <Navbar/>
            
            <div className='container-infor'>
                <Link to="/" className="back-link">
                    <FaArrowLeft /> Quay lại trang chủ
                </Link>
                <h1 className="profile-title">Hồ sơ của tôi</h1>
                {
                    updateMessage && (
                        <Alert variant={updateMessage.includes("thành công") ? "success" : "danger"}>
                            {updateMessage}
                        </Alert>
                    )
                }
                <Container className='profile-container'>
                    <Row>
                        <Col md={8}>
                            <Form className="user-form">
                                <Form.Group className="mb-4" controlId="fullName">
                                    <Form.Label>Họ và tên</Form.Label>
                                    <Form.Control type="text" name="name" value={values.name} onChange={handleChange} />
                                </Form.Group>
                                
                                <Form.Group className="mb-4" controlId="phone">
                                    <Form.Label>Số điện thoại</Form.Label>
                                    <Form.Control type="text" name="phone" value={values.phone} onChange={handleChange} />
                                </Form.Group>
                                
                                <Form.Group className="mb-4" controlId="email">
                                    <Form.Label>Địa chỉ email</Form.Label>
                                    <Form.Control type="email" name="email" value={user.email || ''} onChange={handleChange} disabled/>
                                </Form.Group>
                                
                                <Form.Group className="mb-4" controlId="address">
                                    <Form.Label>Địa chỉ</Form.Label>
                                    <Form.Control type="text" name="address" value={values.address} onChange={handleChange} />
                                </Form.Group>
                                
                                <Button variant="outline-warning" className="update-btn" onClick={handleUpdate}>
                                    Lưu cập nhật
                                </Button>
                            </Form>
                        </Col>
                        <Col md={4} className="avatar-section">
                            <div className="avatar-container">
                                <div className="avatar-display">
                                    <Image 
                                        src={
                                            displayImage ? displayImage : 
                                            (user.avatar ? `${API_URL}/${user.avatar}` : "/default-avatar.jpg")
                                        } 
                                        alt="avatar" 
                                        className="avatar-image"
                                    />
                                </div>
                                <div className="avatar-update">
                                    <Form.Control
                                        type="file"
                                        multiple = {false}
                                        className="d-none"
                                        id="imageUpload"
                                        accept="image/*"
                                        onChange={handleImageUpload}
                                    />
                                    <label htmlFor="imageUpload" className="btn-changeAvatar mt-2 p-2">
                                    Thay đổi ảnh
                                    </label>
                                </div>
                            </div>
                        </Col>
                    </Row>
                </Container>
                
                <div className="text-end mt-5 mb-5">
                    <Button variant="danger" className="logout-btn" onClick={logout}>
                        Đăng xuất
                    </Button>
                </div>
            </div>
            <Footer/>
        </div>
    );
}

export default InforUser;