import React from 'react';
import { Link } from 'react-router-dom';

const NotFound = () => {
  return (
    <div className="flex flex-col items-center justify-center h-screen">
      <h1 className="text-6xl font-bold text-gray-800 mb-4">404</h1>
      <p className="text-xl text-gray-600 mb-8">Trang bạn đang tìm kiếm không tồn tại</p>
      <Link to="/admin" className="btn btn-primary">
        Quay lại trang chủ
      </Link>
    </div>
  );
};

export default NotFound; 