// middleware/errorHandler.js
const errorHandler = (err, req, res, next) => {
    console.error("Lỗi:", err.message);
    res.status(500).json({ message: err.message || "Lỗi server" });
  };
  
  module.exports = errorHandler;