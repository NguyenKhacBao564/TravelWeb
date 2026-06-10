// middleware/authMiddleware.js
const { verifyToken } = require('./jwt');
const ERROR_MESSAGES = require('../utils/errorConstants');

const authMiddleware = (req, res, next) => {
  try {
    const token = req.cookies.jwt;
    if (!token) {
      return res.status(401).json({
        code: ERROR_MESSAGES.AUTH.INVALID_TOKEN.code,
        message: 'No token provided',
      });
    }

    const decoded = verifyToken(token);
    req.user = {
      userId: decoded.userId,
      role: decoded.role,
    };
    next();
  } catch (error) {
    return res.status(401).json({
      code: ERROR_MESSAGES.AUTH.INVALID_TOKEN.code,
      message: 'Invalid token',
      error: error.message,
    });
  }
};

const restrictTo = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return res.status(403).json({
        code: ERROR_MESSAGES.AUTH.FORBIDDEN.code,
        message: 'Thông tin người dùng không hợp lệ',
      });
    }
    const userRole = req.user.role;
    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({
        code: ERROR_MESSAGES.AUTH.FORBIDDEN.code,
        message: 'Bạn không có quyền truy cập vào tài nguyên này',
      });
    }
    next();
  };
};

const restrictToSelf = (idField) => {
  return (req, res, next) => {
    if (!req.user || !req.user.userId) {
      return res.status(403).json({
        code: ERROR_MESSAGES.AUTH.FORBIDDEN.code,
        message: 'Thông tin người dùng không hợp lệ',
      });
    }
    const userId = req.user.userId;
    const resourceId = req.params[idField];

    if (req.user.role === 'customer' && userId !== resourceId) {
      return res.status(403).json({
        code: ERROR_MESSAGES.AUTH.FORBIDDEN.code,
        message: 'Bạn chỉ có thể truy cập dữ liệu của chính mình',
      });
    }
    next();
  };
};


// Middleware kiểm tra vai trò
// const restrictTo = (...allowedRoles) => {
//   return (req, res, next) => {
//     const userRole = req.user.role; // Lấy role từ authMiddleware
//     if (!allowedRoles.includes(userRole)) {
//       return res.status(403).json({
//         code: ERROR_MESSAGES.AUTH.FORBIDDEN.code,
//         message: 'Bạn không có quyền truy cập vào tài nguyên này',
//       });
//     }
//     next();
//   };
// };



module.exports = { authMiddleware, restrictTo, restrictToSelf };