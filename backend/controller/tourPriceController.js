const {sql, getPool} = require("../config/db");

const getTourPrice = async (req, res) => {
    try{
        const tour_id = req.params.tour_id;
        const pool = await getPool();
        const result =  await pool.request()
        .input("tour_id", sql.NVarChar, tour_id)
        .query("SELECT * FROM Tour_price WHERE tour_id = @tour_id");
        
        return res.status(200).json(result.recordset);
    } catch (error) {
        return res.status(500).json({error: error.message});
    }
    
}


const getTourPriceById = async (req, res) => {
    try{
        const tour_id = req.params.tour_id;
        const pool = await getPool();
        const result =  await pool.request()
        .input("tour_id", sql.NVarChar, tour_id)
        .query("SELECT * FROM Tour_price WHERE tour_id = @tour_id");
        
        return res.status(200).json(result.recordset);
    } catch (error) {
        return res.status(500).json({error: error.message});
    }
    
}



const getAllTourPrice = async (req, res) => {
    try{
        const pool = await getPool();
        const result = await pool.request()
        .query(`SELECT t.tour_id,t.branch_id, t.name, t.destination,t.departure_location,t.start_date,t.end_date,t.max_guests,t.transport,t.created_at,tp.age_group,tp.price 
            FROM Tour AS t
            LEFT JOIN Tour_Price AS tp 
            ON t.tour_id = tp.tour_id`);
        return res.status(200).json(result.recordset);
    } catch (error) {
        return res.status(500).json({error: error.message});
    }
}

const updateTourPrice = async (transaction, tour_id, prices) =>{
    try{
       const caseSQL = prices.map(({age_group, price}) => `WHEN '${age_group}' THEN ${price}`).join("\n");
       await transaction.request()
       .input("tour_id", sql.NVarChar, tour_id)
       .input("case_sql", sql.NVarChar, caseSQL)
       .query(`UPDATE Tour_price SET price = CASE age_group ${caseSQL}  END WHERE tour_id = @tour_id`);
    }catch(error){
        throw new Error("Lỗi khi cập nhật giá tour");
    }
}
const addTourPrice = async (transaction, tour_id, listPrice) => {
    for (const item of listPrice) {
        const {age_group, price} = item;
        console.log("item: ", item);
        // const formatPrice = price.replace(/\./g, '')
        const tourPriceRequest = transaction.request();
        await tourPriceRequest
        .input("tour_id", sql.NVarChar, tour_id)
        .input("age_group", sql.NVarChar, age_group)
        .input("price", sql.Decimal(15, 2), price)
        .query(`INSERT INTO Tour_price (tour_id, age_group, price) VALUES (@tour_id, @age_group, @price)`);
    }
}

module.exports = {getTourPrice, getAllTourPrice, addTourPrice, updateTourPrice};
