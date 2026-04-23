const {sql, getPool} = require("../config/db");

const getAllReviewsByTourId = async (req, res) => {
    try {
        const tour_id = req.params.id;

        const page = parseInt(req.query.page) || 1; // Trang hiện tại, mặc định là 1
        const limit = parseInt(req.query.limit) || 5; // Số lượng bình luận mỗi trang, mặc định là 5
        const offset = (page - 1) * limit; // Tính offset cho truy vấn SQL

        // Kiểm tra tour_id hợp lệ
        if (!tour_id) {
            return res.status(400).json({ error: "Tour ID is required" });
        }
        
        console.log("Tour ID:", tour_id, "Page:", page, "Limit:", limit);
        const pool = await getPool();
        const result = await pool.request()
        .input("tour_id", sql.NVarChar, tour_id)
        .input("offset", sql.Int, offset)
        .input("limit", sql.Int, limit)
        .query(`SELECT r.review_id, r.tour_id, r.cus_id, r.rating, r.comment, r.review_date,
                        c.fullname AS name, c.pi_url AS avatar
                FROM Review AS r
                JOIN Customer AS c ON r.cus_id = c.cus_id
                WHERE r.tour_id = @tour_id
                ORDER BY r.review_date
                OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`);
        // console.log("Reviews fetched:", result.recordset);
        return res.status(200).json(result.recordset);
    } catch (error) {
        return res.status(500).json({error: error.message});
    }
}

const getStatsResults = async (req, res) => {
    try {
        const tour_id = req.params.id;
        const pool = await getPool();
        const result = await pool.request()
            .input("tour_id", sql.NVarChar, tour_id)
            .query(`SELECT 
                        COUNT(*) AS total_reviews,
                        ROUND(AVG(CAST(rating AS FLOAT)), 2) AS average_rating
                    FROM Review
                    WHERE tour_id = @tour_id`);

        
       const { total_reviews, average_rating } = result.recordset[0] || {
            total_reviews: 0,
            average_rating: 0
        };
       
        // console.log("Total reviews:", total_reviews, "Average rating:", average_rating);
        return res.status(200).json({ 
            average_rating: parseFloat(average_rating) || 0, 
            total_reviews}
        );
    } catch (error) {
        console.error("Error fetching stats results:", error);
        return res.status(500).json({error: error.message});
    }
}


const getReviewById = async (req, res) => { }

const addReview = async (req, res) => {
    try {
        const {review_id, tour_id, cus_id, rating, comment } = req.body;
        // console.log("Received review data:", req.body);
        // console.log("Adding review:", { review_id, tour_id, cus_id, rating, comment });
        const pool = await getPool();
        const result = await pool.request()
            .input("review_id", sql.NVarChar, review_id)
            .input("tour_id", sql.NVarChar, tour_id)
            .input("cus_id", sql.NVarChar, cus_id)
            .input("rating", sql.Int, rating)
            .input("comment", sql.NVarChar, comment)
            .query(`INSERT INTO Review (review_id,tour_id, cus_id, rating, comment, review_date)
                    VALUES (@review_id, @tour_id, @cus_id, @rating, @comment, GETDATE())`);
        return res.status(201).json({ message: "Review added successfully" });
    } catch (error) {
        console.error("Error adding review:", error);
        return res.status(500).json({ error: error.message });
    }

}



module.exports = {
    getAllReviewsByTourId,
    getReviewById,
    addReview,
    getStatsResults
};