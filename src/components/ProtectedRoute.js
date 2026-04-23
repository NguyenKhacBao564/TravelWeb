// src/components/ProtectedRoute.js
import React, { useContext } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";

function ProtectedRoute({ children, allowedRoles }) {
  const { user, loading } = useContext(AuthContext);
  console.log("User in ProtectedRoute: ", user);
  const navigate = useNavigate();
  // Hiển thị loading khi đang kiểm tra đăng nhập
  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{height: "100vh"}}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Đang tải...</span>
        </div>
      </div>
    );
  }

 

  if (!user) {
    // Nếu chưa đăng nhập, chuyển hướng về trang đăng nhập
    return <Navigate to="/login" />;
  }

  if (!allowedRoles.includes(user.role)) {
    // Nếu không có quyền, chuyển hướng về trang không có quyền
    return <Navigate to="/unauthorized" />;
  }

  return children;
}

export default ProtectedRoute;