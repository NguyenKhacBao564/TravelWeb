const multer = require('multer');
const path = require('path');

// Cấu hình multer để lưu file vào thư mục 'uploads'
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/'); // Lưu vào backend/uploads/
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname)); // Tên file duy nhất
  }
});

const upload = multer({ storage: storage });

module.exports = upload;