// src/utils/errorConstants.js

const ERROR_MESSAGES = {
  AUTH: {
    INVALID_TOKEN: {
      code: "AUTH_001",
      message: "Token không hợp lệ. Vui lòng đăng nhập lại.",
    },
    LOGIN_FAILED: {
      code: "AUTH_002",
      message: "Tên đăng nhập hoặc mật khẩu không đúng!",
    },
    REGISTRATION_FAILED: {
      code: "AUTH_003",
      message: "Đăng ký thất bại. Email đã được sử dụng.",
    },
    TOKEN_EXPIRED: {
      code: "AUTH_004",
      message: "Token đã hết hạn. Vui lòng đăng nhập lại.",
    },
    USER_NOT_FOUND: {
      code: "AUTH_005",
      message: "Không tìm thấy user trong bảng Customer",
    },
    FORBIDDEN: {
      code: "AUTH_006",
      message: "Không tìm thấy user trong bảng Employee",
    },
    ACCOUNT_INACTIVE: {
      code: "AUTH_INACTIVE",
      message: "Tài khoản hiện không hoạt động"
    },
  },
  API: {
    NETWORK_ERROR: {
      code: "API_001",
      message: "Lỗi kết nối mạng. Vui lòng thử lại sau.",
    },
    SERVER_ERROR: {
      code: "API_002",
      message: "Lỗi máy chủ. Vui lòng liên hệ quản trị viên.",
    },
  },
  SUPPORT: {
    REQUEST_FAILED: {
      code: "SUPPORT_REQUEST_FAILED",
      message: "Không thể gửi yêu cầu hỗ trợ"
    }
  },
};
module.exports = ERROR_MESSAGES;