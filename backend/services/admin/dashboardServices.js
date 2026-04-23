const { sql, getPool } = require("../../config/db");
const ERROR_MESSAGES = require("../../utils/errorConstants");

const getOverviewStats = async () => {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT
        (SELECT COUNT(*) FROM Booking)          AS totalBookings,
        (SELECT ISNULL(SUM(amount), 0) FROM Payments 
         WHERE payment_status = 'COMPLETED' 
         AND YEAR(created_at) = YEAR(GETDATE())) AS totalRevenue,
        (SELECT COUNT(*) FROM Customer WHERE cus_status='active')         AS totalCustomers,
        (SELECT COUNT(*) FROM Tour)             AS totalTours
    `);
    return result.recordset[0];
  } catch (error) {
    console.error("Lỗi khi lấy số liệu tổng quan:", error);
    throw new Error(ERROR_MESSAGES.API.SERVER_ERROR.message);
  }
};


// Lấy dữ liệu biểu đồ tỷ lệ tour hoàn thành / chưa khởi hành
const getTourChartData = async () => {
    try {
      const pool = await getPool();
      const result = await pool.request().query(`
        SELECT
          COUNT(CASE WHEN end_date < GETDATE() AND status = 'completed' THEN 1 END) AS completed,
          COUNT(CASE WHEN start_date > GETDATE() AND status = 'active' THEN 1 END) AS pending
        FROM Tour
      `);
      
      const data = result.recordset[0];
      return {
        completed: data.completed || 0,
        pending: data.pending || 0
      };
    } catch (error) {
      console.error("Lỗi khi lấy dữ liệu biểu đồ tour:", error);
      throw new Error(ERROR_MESSAGES.API.SERVER_ERROR.message);
    }
};

// Lấy 5 giao dịch gần nhất (từ bảng Payments - chỉ những giao dịch đã hoàn thành)
const getRecentTransactions = async () => {
    try {
      const pool = await getPool();
      const result = await pool.request().query(`
        SELECT TOP 5
          p.payment_id,
          c.fullname       AS customerName,
          c.phone,
          b.tour_id        AS tourCode,
          FORMAT(p.created_at, 'yyyy-MM-dd') AS time,
          p.amount,
          p.payment_status AS status
        FROM Payments p
        INNER JOIN Booking b ON p.booking_id = b.booking_id
        INNER JOIN Customer c ON b.cus_id = c.cus_id
        WHERE p.payment_status = 'COMPLETED'
        ORDER BY p.created_at DESC
      `);
      return result.recordset;
    } catch (error) {
      console.error("Lỗi khi lấy giao dịch gần đây:", error);
      throw new Error(ERROR_MESSAGES.API.SERVER_ERROR.message);
    }
  };

module.exports = {
  getOverviewStats,
  getTourChartData,
  getRecentTransactions
  };