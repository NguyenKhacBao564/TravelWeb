// src/components/Unauthorized.js
import React from "react";
import { Container, Alert } from "react-bootstrap";
import { Link } from "react-router-dom";

function Unauthorized() {
  return (
    <Container className="mt-5">
      <Alert variant="danger">
        <h4>Không có quyền truy cập</h4>
        <p>Bạn không có quyền truy cập vào trang này.</p>
        {/* <Link to="/">Quay lại trang chủ</Link> */}
      </Alert>
    </Container>
  );
}

export default Unauthorized;