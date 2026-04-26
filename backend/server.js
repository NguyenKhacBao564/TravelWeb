const express = require("express");
const cors = require("cors");
const cookieParser = require('cookie-parser');
const axios = require('axios');
// const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();


const tourRoutes = require("./routes/tourRoutes");
const authRoutes = require("./routes/authRoutes");
const customerRoutes = require("./routes/customerRoutes");
const adminRoutes = require('./routes/adminRoutes'); // NKBao đã thêm
const paymentRoutes = require('./routes/paymentRoutes'); // VNPay payment routes
const bookingRoutes = require('./routes/bookingRoutes'); // Booking routes

require("dotenv").config();
const PORT = process.env.PORT || 3001;

const tourPriceRoutes = require("./routes/tourPriceRoutes");
const promotionRoutes = require("./routes/promotionRoutes");
const scheduleRoutes = require("./routes/scheduleRoutes");
const customerSupportRoutes = require("./routes/customerSupportRoutes");
const consultantSupportRoutes = require("./routes/consultantSupportRoutes");
const chatRoutes = require("./routes/chatRoutes");
const reviewRoutes = require("./routes/reviewRoutes");
const favoriteTourRoutes = require("./routes/favoriteTourRoutes");
const historyBookingRoutes = require("./routes/historyBookingRoutes");
const resetPasswordRoutes = require("./routes/resetPasswordRoutes");

app.use(cors({
  origin: [
    'http://localhost:3000', // Development
    'http://127.0.0.1:3000', // Development via loopback IP
    'http://54.219.205.247', // EC2 IP
    'http://tourguideeeee.fun', // Domain
    'http://www.tourguideeeee.fun' // WWW Domain
  ], // Domain của frontend
  credentials: true, // Cho phép gửi cookie
}));
app.use(express.json());
app.use(cookieParser());

// Phục vụ file tĩnh từ thư mục uploads
app.use('/uploads', express.static('uploads'));

//Sử dụng các Route
app.use("/chat", chatRoutes);
app.use("/tours", tourRoutes);
app.use("/promotions", promotionRoutes);
app.use("/auth", authRoutes);
app.use("/customers", customerRoutes);
app.use("/api/admin", adminRoutes); // NKBao đã thêm
app.use("/api/payment", paymentRoutes); // VNPay payment routes
app.use("/api/booking", bookingRoutes); // Booking routes
app.use("/tourPrice", tourPriceRoutes);
app.use("/favoriteTours", favoriteTourRoutes)
app.use("/tour-price", tourPriceRoutes);
app.use("/schedule", scheduleRoutes);
app.use("/historyBooking", historyBookingRoutes)
app.use("/reset-password", resetPasswordRoutes); // Route cho reset password
app.use("/api/customer", customerSupportRoutes); // Thêm route cho support
app.use("/api/consultant", consultantSupportRoutes);
app.use("/reviews", reviewRoutes);

// Health check endpoint for Docker
app.get("/api/health", (req, res) => {
  res.status(200).json({ 
    status: "OK", 
    timestamp: new Date().toISOString(),
    service: "tour-booking-backend"
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Server chạy tại http://localhost:${PORT}`);
});
