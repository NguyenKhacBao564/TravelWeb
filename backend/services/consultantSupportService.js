const { sql, getPool } = require("../config/db");
const ERROR_MESSAGES = require("../utils/errorConstants");
const nodemailer = require("nodemailer");

// Cấu hình transporter cho Nodemailer
const transporter = nodemailer.createTransport({
    service: "Gmail",
    auth: {
        user: process.env.EMAIL_USER, // Tài khoản của bạn
        pass: process.env.EMAIL_PASS, // App Password của bạn
    },
});

// Lấy danh sách yêu cầu hỗ trợ
const getSupportRequests = async (req, res) => {
    try {
        const pool = await getPool();
        console.log("connecting to database...");
        const result = await pool
            .request()
            .query(`
                SELECT csr.request_id, csr.cus_id, csr.subject, csr.message, csr.created_at, csr.status,
                       c.fullname AS customer_name, c.phone, c.email
                FROM Customer_Support_Request csr
                LEFT JOIN Customer c ON csr.cus_id = c.cus_id
            `);
        console.log("Database Result:", result.recordset);
        res.json(result.recordset);
    } catch (error) {
        console.error("Database Error:", error.message);
        return res.status(500).json({
            code: ERROR_MESSAGES.API.SERVER_ERROR.code,
            message: ERROR_MESSAGES.API.SERVER_ERROR.message,
        });
    }
};

// Lưu phản hồi và gửi email
const createSupportResponse = async (req, res) => {
    try {
        const { response_id, request_id, emp_id, re_message, day, customer_email } = req.body;

        if (!response_id || !request_id || !emp_id || !re_message || !customer_email) {
            return res.status(400).json({
                code: ERROR_MESSAGES.SUPPORT.REQUEST_FAILED.code,
                message: "Vui lòng điền đầy đủ thông tin phản hồi và email khách hàng",
            });
        }

        const pool = await getPool();
        const transaction = pool.transaction();
        try {
            await transaction.begin();

            // Lưu phản hồi
            await transaction
                .request()
                .input("response_id", sql.VarChar, response_id)
                .input("request_id", sql.VarChar, request_id)
                .input("emp_id", sql.VarChar, emp_id)
                .input("re_message", sql.VarChar, re_message)
                .input("day", sql.DateTime, new Date(day))
                .query(`
                    INSERT INTO Customer_Support_Response (response_id, request_id, emp_id, re_message, day)
                    VALUES (@response_id, @request_id, @emp_id, @re_message, @day)
                `);

            // Cập nhật trạng thái yêu cầu
            await transaction
                .request()
                .input("request_id", sql.VarChar, request_id)
                .input("status", sql.VarChar, "Resolved")
                .query(`
                    UPDATE Customer_Support_Request
                    SET status = @status
                    WHERE request_id = @request_id
                `);

            // Gửi email cho khách hàng
            const mailOptions = {
                from: process.env.EMAIL_USER,
                to: customer_email,
                subject: `Phản hồi yêu cầu hỗ trợ #${request_id}`,
                text: `Kính gửi Quý khách,\n\nChúng tôi đã nhận được yêu cầu hỗ trợ của bạn và đây là phản hồi:\n\n${re_message}\n\nTrân trọng,\nĐội ngũ hỗ trợ`,
                html: `
                    <p>Phản hồi của chúng tôi là: <br/>${re_message}</p>
                `
            };

            await transporter.sendMail(mailOptions);
            console.log("Email sent to:", customer_email);

            await transaction.commit();
            res.status(201).json({ message: "Phản hồi đã được gửi, trạng thái được cập nhật và email đã được gửi thành công" });
        } catch (err) {
            await transaction.rollback();
            console.error("Lỗi trong giao dịch: ", err.message);
            throw err;
        }
    } catch (error) {
        console.error("Lỗi khi gửi phản hồi hoặc email:", error.message);
        return res.status(500).json({
            code: ERROR_MESSAGES.API.SERVER_ERROR.code,
            message: ERROR_MESSAGES.API.SERVER_ERROR.message,
        });
    }
};

module.exports = { getSupportRequests, createSupportResponse };