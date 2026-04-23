const {sql, getPool} = require("../config/db");

// Hàm thêm lịch trình vào bảng Itinerary
const insertItinerary = async (transaction, tour_id, itinerary) => {
    for (const item of itinerary) {
      const { schedule_id, day_number, tour_route, detail } = item;
  
      if (!schedule_id || !day_number || !tour_route || !detail) {
        throw new Error('Thiếu dữ liệu!');
      }
  
      const itineraryRequest = transaction.request();
      await itineraryRequest
        .input('scheduleID', sql.NVarChar, schedule_id)
        .input('tourId', sql.NVarChar, tour_id)
        .input('dayNumber', sql.Int, day_number)
        .input('tourRoute', sql.NVarChar, tour_route)
        .input('detail', sql.NVarChar, detail)
        .query(`
          INSERT INTO Tour_Schedule (schedule_id, tour_id, day_number, tour_route, detail)
          VALUES (@scheduleID, @tourId, @dayNumber, @tourRoute, @detail)
        `);
        console.log('insert itinerary', schedule_id, tour_id, day_number, tour_route, detail);
    }
  };

const updateItinerary = async (transaction, tour_id, itinerary) => {
  try {
    // Kiểm tra và log giá trị tour_id
    console.log('Đang xóa lịch trình cho tour_id:', tour_id);
    
    //Xóa các lịch trình cũ
    const deleteRequest = transaction.request();
    const result = await deleteRequest
      .input("tour_id", sql.NVarChar, tour_id)
      .query("DELETE FROM Tour_Schedule WHERE tour_id = @tour_id");
    console.log('result: ', result);
    console.log('Đã xóa lịch trình cũ, đang thêm lịch trình mới...');

    // Thêm các lịch trình mới
    if (itinerary && Array.isArray(itinerary) && itinerary.length > 0) {
      for (const item of itinerary) {
        // Tạo ID mới cho mỗi lịch trình để tránh xung đột
        const newScheduleId = item.schedule_id;
        
        console.log('Thêm lịch trình mới với ID:', newScheduleId);
        
        //Tạo mỗi request để thêm lịch trình mới
        const insertRequest = transaction.request();
        await insertRequest
          .input("tour_id", sql.NVarChar, tour_id)
          .input("schedule_id", sql.NVarChar, newScheduleId) // schedule_id hoặc id
          .input("day_number", sql.Int, item.day_number)
          .input("tour_route", sql.NVarChar, item.tour_route)
          .input("detail", sql.NVarChar, item.detail)
          .query(`
            INSERT INTO Tour_Schedule (schedule_id, tour_id, day_number, tour_route, detail)
            VALUES (@schedule_id, @tour_id, @day_number, @tour_route, @detail)
          `);
      }
    }
    console.log('Cập nhật lịch trình hoàn tất!');
  } catch (error) {
    console.error('Lỗi khi cập nhật lịch trình:', error);
    throw error; // Đảm bảo lỗi được chuyển tiếp để transaction rollback
  }
}
 const getItinerary = async (req, res) => {
    try {
        const tour_id = req.params.tour_id;
        const pool = await getPool();
        const result = await pool.request()
        .input("tour_id", sql.NVarChar, tour_id)
        .query("SELECT * FROM Tour_Schedule WHERE tour_id = @tour_id ORDER BY day_number");
        return res.status(200).json(result.recordset);
    } catch (error) {
        return res.status(500).json({error: error.message});
    }
 }

  module.exports = {
    insertItinerary,
    getItinerary,
    updateItinerary
  };