const { sql, getPool } = require("../../config/db");
const ERROR_MESSAGES = require("../../utils/errorConstants");

// Duyệt tour theo ID
const approveTourById = async (tourId) => {
    try {
      const pool = await getPool();
      const result = await pool.request()
        .input('tourId', sql.NVarChar, tourId)
        .query(`
          UPDATE Tour
          SET status = 'active'
          WHERE tour_id = @tourId
        `);
      if (result.rowsAffected[0] === 0) {
        throw new Error('Không tìm thấy tour để duyệt');
      }
      return;
    } catch (err) {
      console.error('Lỗi khi duyệt tour:', err);
      throw err;
    }
};

// Từ chối tour theo ID
const rejectTourById = async (tourId) => {
    try {
      const pool = await getPool();
      const result = await pool.request()
        .input('tourId', sql.NVarChar, tourId)
        .query(`
          UPDATE Tour
          SET status = 'reject'
          WHERE tour_id = @tourId
        `);
      if (result.rowsAffected[0] === 0) {
        throw new Error('Không tìm thấy tour để từ chối');
      }
      return;
    } catch (err) {
      console.error('Lỗi khi từ chối tour:', err);
      throw err;
    }
};

// Hàm cập nhật trạng thái tour tự động
const updateTourStatus = async () => {
    try {
      const pool = await getPool();
  
      // Cập nhật tour sắp khởi hành
      await pool.request().query(`
        UPDATE Tour
        SET status = 'upcoming'
        WHERE start_date > GETDATE()
          AND start_date <= DATEADD(DAY, 7, GETDATE())
          AND status NOT IN ('inactive', 'reject');
      `);
      
      // Cập nhật tour đang diễn ra
      await pool.request().query(`
        UPDATE Tour
        SET status = 'ongoing'
        WHERE start_date <= GETDATE() AND end_date >= GETDATE() AND status = 'upcoming'
      `);
      
      // Cập nhật tour đã kết thúc
      await pool.request().query(`
        UPDATE Tour
        SET status = 'completed'
        WHERE end_date < GETDATE() AND status = 'ongoing'
      `);
  
      console.log('Đã cập nhật trạng thái tour thành công');
    } catch (error) {
      console.error('Lỗi khi cập nhật trạng thái tour:', error);
      throw new Error(`Không thể cập nhật trạng thái tour: ${error.message}`);
    }
};

// Lấy danh sách tour theo trạng thái và phân trang
const getToursByStatusAndPage = async ( page, pageSize) => {
    const status = 'pending'; // Trạng thái tour mặc định là 'pending'
    try {
      const pool = await getPool();
      const offset = (page - 1) * pageSize;
  
      // 1) Lấy dữ liệu
      const result = await pool.request()
        .input('status', sql.NVarChar, status)
        .input('offset', sql.Int, offset)
        .input('pageSize', sql.Int, pageSize)
        .query(`
          SELECT 
            t.tour_id,
            t.name,
            t.destination,
            FORMAT(t.start_date, 'yyyy-MM-dd') as start_date,
            FORMAT(t.end_date, 'yyyy-MM-dd') as end_date,
            t.status,
            t.duration,
            t.max_guests,
            t.description,
            FORMAT(t.created_at, 'yyyy-MM-dd') as created_at,
            b.branch_name,
            AVG(CAST(tp.price AS FLOAT)) as avg_price
          FROM Tour t
          LEFT JOIN Branch b ON t.branch_id = b.branch_id
          LEFT JOIN Tour_price tp ON t.tour_id = tp.tour_id
          WHERE t.status = @status
          GROUP BY t.tour_id, t.name, t.destination, t.start_date, t.end_date, t.status, t.duration, t.max_guests, t.description, t.created_at, b.branch_name
          ORDER BY t.created_at DESC
          OFFSET @offset ROWS
          FETCH NEXT @pageSize ROWS ONLY
        `);
  
      // 2) Lấy tổng
      const countRes = await pool.request()
        .input('status', sql.NVarChar, status)
        .query(`SELECT COUNT(*) AS total FROM Tour WHERE status = @status`);
  
      const total = countRes.recordset[0].total;
      const tours = result.recordset;
      return { tours, total };
    } catch (err) {
      console.error('Lỗi getToursByStatusAndPage:', err);
      throw err;
    }
  };

module.exports = {
  approveTourById,
  rejectTourById,
  updateTourStatus,
  getToursByStatusAndPage
  };