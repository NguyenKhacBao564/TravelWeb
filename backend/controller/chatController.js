const {sql, getPool} = require("../config/db");
const axios = require('axios');
const { GoogleGenerativeAI } = require('@google/generative-ai');


const PYTHON_API_URL = 'http://localhost:8000/chat';

const getTourByChat = async (location, datetime, price) =>{
    console.log("location: ", location);
   
    console.log("price: ", price.replace(/\.|,/g, ''));
    try{
      let formattedDatetime = null;
      const currentYear = new Date().getFullYear(); // Lấy năm hiện tại (2025)
      if (datetime) {
          const date = new Date(datetime);
          if (!isNaN(date)) {
              // Kiểm tra năm của datetime
              if (date.getFullYear() !== currentYear) {
                  // Đặt lại năm thành năm hiện tại
                  date.setFullYear(currentYear);
              }
              formattedDatetime = date.toISOString().split('T')[0]; // YYYY-MM-DD
          } else {
              throw new Error('Invalid datetime format');
          }
      }
      const pool = await getPool();
      const result = await pool.request()
      .input('location', sql.NVarChar, location)
      .input('datetime', sql.Date, formattedDatetime)
      .input('price', sql.Decimal(15, 2), price.replace(/\.|,/g, ''))
      .query(`SELECT t.tour_id, t.name, t.destination,t.start_date,t.end_date,t.duration, tp.price, tp.age_group
          FROM Tour AS t
          LEFT JOIN Tour_Price AS tp 
          ON t.tour_id = tp.tour_id WHERE t.status = 'active' 
          AND tp.age_group = 'adultPrice'
          AND (t.destination LIKE '%' + @location + '%' OR t.name LIKE '%' + @location + '%')
          AND t.start_date >= @datetime
          AND tp.price <= @price
          `);
      console.log("datetime: ", datetime);
      console.log("SQL Query:", result.query);
        // Nhóm dữ liệu theo tour_id
      const toursMap = [];
      result.recordset.forEach((row) => {
          toursMap.push({
            tour_id: row.tour_id,
            name: row.name,
            destination: row.destination,
            start_date: row.start_date,
            end_date: row.end_date,
            duration: row.duration,
            prices: row.price,
          })
      });
      // const tours = Object.values(toursMap);
      return toursMap
    } catch (error) {
        console.error('Error querying tours:', error.message);
        throw error;
    }

}


const getRespondChat = async (req, res) => {
  try {
    const { query } = req.body;
    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    // Gọi API của chatbot Python
    const chatbotResponse = await axios.post(PYTHON_API_URL , { query });
    var context = chatbotResponse.data.response;
    const response_infor = chatbotResponse.data
    console.log(response_infor);
    console.log('respond:', context);
    if(response_infor.status === "success"){
      try{
        const tourList = await getTourByChat(response_infor.location, response_infor.time, response_infor.price)
        console.log("tourList: ", tourList);
        if (tourList.length === 0){
          return res.json({ response: "Xin lỗi, hiện tại không có tour nào phù hợp với yêu cầu của bạn. Vui lòng chọn tour khác hoặc gọi đến số hotline: 0919xxxxx để được tư vấn ạ." });
        }
        return res.json({ response: context , tourlist: tourList });
      }catch (error) {
        console.error('Error:', error.message);
        return res.status(500).json({ error: 'Something went wrong' });
      }

    }


    return res.json({ response: context });
  } catch (error) {
    console.error('Error:', error.message);
    return res.status(500).json({ error: 'Something went wrong' });
  }
};



module.exports = {
  getRespondChat,
};