const {sql, getPool} = require("../config/db");
const {v4: uuidv4} = require("uuid");



  const uploadTourImage = async (transaction, tourId, imagePaths) => {
    for(const imagePath of imagePaths){
        const imageId = uuidv4().replace(/-/g, '').slice(0, 10);
        await transaction.request()
        .input("image_id", sql.NVarChar, imageId)
        .input("tour_id", sql.NVarChar, tourId)
        .input("image_url", sql.NVarChar,  imagePath)
        .query(`
        INSERT INTO Tour_image (image_id, tour_id, image_url)
        VALUES (@image_id, @tour_id, @image_url)
        `)
        }
  }

  
  const getTourImages = async (req, res) => {
    try{
        const tourId = req.params.id;
        const pool = await getPool();
        const result = await pool.request()
        .input("tour_id", sql.NVarChar, tourId)
        .query(`SELECT image_url FROM Tour_image WHERE tour_id = @tour_id`)
        return res.status(200).json(result.recordset);
    }catch(error){
        throw new Error("Lỗi khi lấy ảnh tour");
    }
  }

  // const uploadCustomerImage = async (req, res) => {
  //   try{
  //       const customerId = req.params.id;
  //       const imagePath = req.file.path;
  //       const pool = await getPool();
  //       const result = await pool.request()
  //       .input("customer_id", sql.NVarChar, customerId)
  //       .input("image_url", sql.NVarChar, imagePath)
  //       .query(`UPDATE Customer SET image_url = @image_url WHERE customer_id = @customer_id`);
  //       return res.status(200).json(result.recordset);
  //   }catch(error){
  //       throw new Error("Lỗi khi upload ảnh khách hàng");
  //   }
  // }




  module.exports = { uploadTourImage, getTourImages};