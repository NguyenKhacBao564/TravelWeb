const { sql, getPool } = require("../../config/db");
const ERROR_MESSAGES = require("../../utils/errorConstants");
const { updateTourStatus } = require("./tourManagementServices");

// Lấy thông tin chi tiết chi nhánh theo ID
const getBranchDetail = async (branchId, year = new Date().getFullYear()) => {
    try {
      // Gọi updateTourStatus trước để cập nhật trạng thái tour
      await updateTourStatus();
      
      const pool = await getPool();
      
      // Query thông tin chi nhánh
      const branchQuery = `
        SELECT branch_id, branch_name, address, phone
        FROM Branch 
        WHERE branch_id = @branchId
      `;
      
      const branchResult = await pool
        .request()
        .input('branchId', branchId)
        .query(branchQuery);
      
      if (!branchResult.recordset || branchResult.recordset.length === 0) {
        throw new Error('Không tìm thấy chi nhánh');
      }
      
      const branch = branchResult.recordset[0];
      
      // Query doanh thu theo tháng trong năm được chọn
      const monthlyRevenueQuery = `
        SELECT 
          MONTH(p.created_at) as month,
          SUM(p.amount) as revenue
        FROM Payments p
        INNER JOIN Booking b ON p.booking_id = b.booking_id
        INNER JOIN Tour t ON b.tour_id = t.tour_id
        WHERE t.branch_id = @branchId 
          AND p.payment_status = 'COMPLETED'
          AND YEAR(p.created_at) = @year
        GROUP BY MONTH(p.created_at)
        ORDER BY MONTH(p.created_at)
      `;
      
      const monthlyResult = await pool
        .request()
        .input('branchId', branchId)
        .input('year', year)
        .query(monthlyRevenueQuery);
      
      // Tạo mảng 12 tháng với giá trị mặc định là 0
      const monthlyRevenue = new Array(12).fill(0);
      monthlyResult.recordset.forEach(row => {
        monthlyRevenue[row.month - 1] = row.revenue || 0;
      });
      
      // Query thống kê tour theo trạng thái (không phụ thuộc năm)
      const tourStatsQuery = `
        SELECT 
          status,
          COUNT(*) as count
        FROM Tour 
        WHERE branch_id = @branchId
        GROUP BY status
      `;
      
      const tourStatsResult = await pool
        .request()
        .input('branchId', branchId)
        .query(tourStatsQuery);
      
      const tourStats = {};
      tourStatsResult.recordset.forEach(row => {
        tourStats[row.status] = row.count;
      });
      
      // Query thống kê booking theo năm
      const bookingStatsQuery = `
        SELECT 
          COUNT(*) as total,
          SUM(total_price) as totalRevenue
        FROM Booking b
        INNER JOIN Tour t ON b.tour_id = t.tour_id
        WHERE t.branch_id = @branchId 
          AND YEAR(b.booking_date) = @year
      `;
      
      const bookingStatsResult = await pool
        .request()
        .input('branchId', branchId)
        .input('year', year)
        .query(bookingStatsQuery);
      
      const bookingStats = bookingStatsResult.recordset[0] || { total: 0, totalRevenue: 0 };
      
      // Query danh sách các năm có dữ liệu
      const availableYearsQuery = `
        SELECT DISTINCT YEAR(p.created_at) as year
        FROM Payments p
        INNER JOIN Booking b ON p.booking_id = b.booking_id
        INNER JOIN Tour t ON b.tour_id = t.tour_id
        WHERE t.branch_id = @branchId 
          AND p.payment_status = 'COMPLETED'
        ORDER BY year DESC
      `;
      
      const yearResult = await pool
        .request()
        .input('branchId', branchId)
        .query(availableYearsQuery);
      
      const availableYears = yearResult.recordset.map(row => row.year);
      // Thêm năm hiện tại nếu chưa có
      const currentYear = new Date().getFullYear();
      if (!availableYears.includes(currentYear)) {
        availableYears.unshift(currentYear);
      }
      
      // Query thống kê nhân viên
      const employeeStatsQuery = `
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN em_status = 'active' THEN 1 ELSE 0 END) as active,
          SUM(CASE WHEN em_status = 'inactive' THEN 1 ELSE 0 END) as locked
        FROM Employee 
        WHERE branch_id = @branchId
      `;
      
      const employeeStatsResult = await pool
        .request()
        .input('branchId', branchId)
        .query(employeeStatsQuery);
      
      const employeeStats = employeeStatsResult.recordset[0] || { total: 0, active: 0, locked: 0 };
      
      return {
        ...branch,
        monthlyRevenue,
        months: ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10', 'T11', 'T12'],
        tourStats,
        bookingStats,
        employeeStats,
        availableYears,
        selectedYear: year
      };
    } catch (error) {
      console.error('Lỗi trong getBranchDetail:', error);
      throw new Error(`Không thể lấy thông tin chi tiết chi nhánh: ${error.message}`);
    }
};

  
// Lấy số tour theo từng chi nhánh
async function getBranchStats() {
  try {
      const pool = await getPool();

      // Thống kê chi nhánh (Doanh thu, Tăng trưởng, Tỷ lệ hủy, Tổng số tour)
      const branchStats = await pool.request()
          .query(`
              WITH BranchRevenue AS (
                  -- Doanh thu năm hiện tại của mỗi chi nhánh
                  SELECT 
                      B.branch_id,
                      B.branch_name,
                      COALESCE(SUM(P.amount), 0) AS current_revenue
                  FROM Branch B
                  LEFT JOIN Tour T ON B.branch_id = T.branch_id
                  LEFT JOIN Booking Bk ON T.tour_id = Bk.tour_id
                  LEFT JOIN Payments P ON Bk.booking_id = P.booking_id 
                      AND P.payment_status = 'COMPLETED'
                      AND YEAR(P.created_at) = YEAR(GETDATE())
                  GROUP BY B.branch_id, B.branch_name
              ),
              PreviousRevenue AS (
                  -- Doanh thu năm trước của mỗi chi nhánh
                  SELECT 
                      B.branch_id,
                      COALESCE(SUM(P.amount), 0) AS previous_revenue
                  FROM Branch B
                  LEFT JOIN Tour T ON B.branch_id = T.branch_id
                  LEFT JOIN Booking Bk ON T.tour_id = Bk.tour_id
                  LEFT JOIN Payments P ON Bk.booking_id = P.booking_id 
                      AND P.payment_status = 'COMPLETED'
                      AND YEAR(P.created_at) = YEAR(GETDATE()) - 1
                  GROUP BY B.branch_id
              ),
              CancellationStats AS (
                  -- Tỷ lệ hủy của mỗi chi nhánh
                  SELECT 
                      B.branch_id,
                      COUNT(CASE WHEN Bk.status = 'canceled' THEN 1 END) AS canceled_count,
                      COUNT(Bk.booking_id) AS total_bookings
                  FROM Branch B
                  LEFT JOIN Tour T ON B.branch_id = T.branch_id
                  LEFT JOIN Booking Bk ON T.tour_id = Bk.tour_id
                  GROUP BY B.branch_id
              ),
              TourCount AS (
                  -- Tổng số tour của mỗi chi nhánh
                  SELECT 
                      B.branch_id,
                      COUNT(T.tour_id) AS total_tours
                  FROM Branch B
                  LEFT JOIN Tour T ON B.branch_id = T.branch_id
                  GROUP BY B.branch_id
              )
              SELECT 
                  BR.branch_id,
                  BR.branch_name,
                  BR.current_revenue AS revenue,
                  'active' AS status,
                  CASE 
                      WHEN PR.previous_revenue = 0 THEN 0
                      ELSE ROUND(((BR.current_revenue - PR.previous_revenue) * 100.0 / PR.previous_revenue), 2)
                  END AS growth_percentage,
                  CASE 
                      WHEN CS.total_bookings = 0 THEN 0
                      ELSE ROUND((CS.canceled_count * 100.0 / CS.total_bookings), 2)
                  END AS cancellation_rate,
                  TC.total_tours
              FROM BranchRevenue BR
              LEFT JOIN PreviousRevenue PR ON BR.branch_id = PR.branch_id
              LEFT JOIN CancellationStats CS ON BR.branch_id = CS.branch_id
              LEFT JOIN TourCount TC ON BR.branch_id = TC.branch_id
              ORDER BY BR.branch_id;
          `);
      
      
      return branchStats.recordset;
  } catch (error) {
      console.error('Lỗi khi lấy thống kê chi nhánh:', error);
      throw new Error('Không thể lấy thống kê chi nhánh');
  } finally {
      //sql.close();
  }
};

// Thêm chi nhánh mới
const createBranch = async ({ branch_name, address, phone }) => {
    try {
      const pool = await getPool();
      await pool.request()
        .input('branch_name', sql.NVarChar, branch_name)
        .input('address', sql.NVarChar, address)
        .input('phone', sql.VarChar, phone)
        .query(`INSERT INTO Branch (branch_name, address, phone) VALUES (@branch_name, @address, @phone)`);
    } catch (error) {
      console.error('Lỗi khi thêm chi nhánh mới:', error);
      
      throw new Error(error.message || 'Không thể thêm chi nhánh mới');
    }
  };

// Lấy danh sách các chi nhánh
const getBranch = async () => {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT branch_id, branch_name, address, phone
      FROM Branch
      ORDER BY branch_name
    `);
    return result.recordset;
  } catch (error) {
    console.error('Lỗi khi lấy danh sách chi nhánh:', error);
    throw new Error('Không thể lấy danh sách chi nhánh');
  }
};


module.exports = {
  getBranchDetail,
  getBranchStats,
  createBranch,
  getBranch
  };