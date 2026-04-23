// src/pages/Admin/Employees/AddEmployee.js

import React, { useState, useEffect } from "react";
import { Form, Button, Row, Col } from "react-bootstrap";
import { Camera } from "lucide-react";
import '../../../styles/admin/addNewEmployee.scss';
import axios from 'axios';
import { API_URL } from "../../../utils/API_Port"; // Import API_URL nếu có

const AddNewEmployee = () => {
  const [preview, setPreview] = useState(null);
  const [form, setForm] = useState({
    fullname: "",
    phone: "",
    address: "",
    email: "",
    password: "",
    confirmPassword: "",
    role_id: "", // Đổi từ role thành role_id
    branch_id: ""  // Đổi từ branch thành branch_id
  });

  // State để chứa danh sách chi nhánh
  const [branches, setBranches] = useState([]);
  // State để theo dõi trạng thái loading
  const [loading, setLoading] = useState(false);

  // Fetch danh sách chi nhánh khi component mount
  useEffect(() => {
    const fetchBranches = async () => {
      setLoading(true);
      try {
        // Sử dụng endpoint getBranch từ adminAPI
        const response = await axios.get(`${API_URL}/api/admin/getBranch`);
        console.log("Data from API:", response.data); // Debug: Log data từ API
        
        // Cập nhật state branches với dữ liệu từ API
        setBranches(response.data || []);
      } catch (error) {
        console.error("Lỗi khi lấy danh sách chi nhánh:", error);
        alert("Không thể lấy danh sách chi nhánh");
      } finally {
        setLoading(false);
      }
    };

    fetchBranches();
  }, []);
  
  const handleFileChange = e => {
    const file = e.target.files[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPreview(url);
  };

  const handleChange = e => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async e => {
    e.preventDefault();
    
    // Validate form
    if (form.password !== form.confirmPassword) {
      alert("Mật khẩu xác nhận không khớp!");
      return;
    }
    
    try {
      // Chuẩn bị dữ liệu gửi lên server
      const employeeData = {
        fullname: form.fullname,
        email: form.email,
        password: form.password,
        phone: form.phone,
        address: form.address,
        role_id: Number(form.role_id),  // Chuyển về kiểu số
        branch_id: Number(form.branch_id) // Chuyển về kiểu số
      };
      
      // Gọi API tạo nhân viên mới
      const response = await axios.post(`${API_URL}/api/admin/employees`, employeeData);
      
      alert("Thêm nhân viên thành công!");
      // Reset form sau khi thêm thành công
      setForm({
        fullname: "",
        phone: "",
        address: "",
        email: "",
        password: "",
        confirmPassword: "",
        role_id: "",
        branch_id: ""
      });
      setPreview(null);
    } catch (error) {
      console.error("Lỗi khi thêm nhân viên:", error);
      alert(`Lỗi khi thêm nhân viên: ${error.response?.data?.error || error.message}`);
    }
  };

  return (
    <div className="add-employee-page">
      <h2 className="page-title">Thêm nhân viên mới</h2>
      <div className="form-card">
        <div className="photo-upload">
          <input
            type="file"
            id="photo"
            accept="image/*"
            onChange={handleFileChange}
            hidden
          />
          <p className="photo-text">Chọn ảnh hồ sơ</p>
          <label htmlFor="photo" className="photo-label">
            {preview ? (
              <img src={preview} alt="avatar" className="photo-preview" />
            ) : (
              <div className="photo-placeholder">
                <Camera size={32} />
              </div>
            )}
          </label>
        </div>

        <Form onSubmit={handleSubmit}>
          <Row>
            <Col md={6}>
              <h5 className="section-title">Nhập thông tin nhân viên</h5>

              <Form.Group className="mb-3">
                <Form.Label>Họ và tên</Form.Label>
                <Form.Control
                  type="text"
                  placeholder="Nguyen Van A"
                  name="fullname"
                  value={form.fullname}
                  onChange={handleChange}
                  required
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Số điện thoại</Form.Label>
                <Form.Control
                  type="tel"
                  placeholder="09xxxxxxxx"
                  name="phone"
                  value={form.phone}
                  onChange={handleChange}
                  required
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Địa chỉ</Form.Label>
                <Form.Control
                  type="text"
                  placeholder="Nhập địa chỉ"
                  name="address"
                  value={form.address}
                  onChange={handleChange}
                  required
                />
              </Form.Group>
            </Col>

            <Col md={6}>
              <h5 className="section-title">Tạo tài khoản</h5>

              <Form.Group className="mb-3">
                <Form.Label>Email</Form.Label>
                <Form.Control
                  type="email"
                  placeholder="info@gmail.com"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  required
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Mật khẩu</Form.Label>
                <Form.Control
                  type="password"
                  placeholder="Nhập mật khẩu"
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  required
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Nhập lại mật khẩu</Form.Label>
                <Form.Control
                  type="password"
                  placeholder="Nhập lại mật khẩu"
                  name="confirmPassword"
                  value={form.confirmPassword}
                  onChange={handleChange}
                  required
                />
              </Form.Group>
            </Col>
          </Row>

          <Row className="align-items-end">
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Phân quyền</Form.Label>
                <Form.Select
                  name="role_id"
                  value={form.role_id}
                  onChange={handleChange}
                  required
                >
                  <option value="">Chọn phân quyền</option>
                  <option value="1">Quản trị viên</option>
                  <option value="2">Nhân viên kinh doanh</option>
                  <option value="3">Nhân viên hỗ trợ</option>
                </Form.Select>
              </Form.Group>
            </Col>

            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Chi nhánh</Form.Label>
                <Form.Select
                  name="branch_id"
                  value={form.branch_id}
                  onChange={handleChange}
                  required
                >
                  <option value="">-- Chọn chi nhánh --</option>
                  {loading ? (
                    <option disabled>Đang tải...</option>
                  ) : (
                    branches.map(branch => (
                      <option key={branch.branch_id} value={branch.branch_id}>
                        {branch.branch_name}
                      </option>
                    ))
                  )}
                </Form.Select>
                {branches.length === 0 && !loading && (
                  <div className="text-danger mt-2">
                    Không thể tải danh sách chi nhánh
                  </div>
                )}
              </Form.Group>
            </Col>
          </Row>

          <div className="text-end">
            <Button className="add-employee-button" type="submit" onClick={handleSubmit}>
              THÊM NHÂN VIÊN
            </Button>
          </div>
        </Form>
      </div>
    </div>
  );
};

export default AddNewEmployee;