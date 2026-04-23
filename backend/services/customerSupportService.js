const { sql, getPool } = require("../config/db");
const bcrypt = require("bcrypt");
const { v4: uuidv4 } = require("uuid");
const ERROR_MESSAGES = require("../utils/errorConstants");

// Hàm băm mật khẩu (tái sử dụng từ authService.js)
const hashPassword = async (password) => {
    const saltRounds = 10;
    let hashedPassword = await bcrypt.hash(password, saltRounds);
    let hashedBuffer = Buffer.from(hashedPassword, "utf8");
    return hashedBuffer;
};



// Hàm tạo yêu cầu hỗ trợ
const createSupportRequest = async (req, res) => {
    try {
        const { firstName, lastName, email, phone, subject, message } = req.body;

        // Kiểm tra dữ liệu đầu vào
        if (!firstName || !lastName || !email || !subject || !message) {
            return res.status(400).json({
                code: ERROR_MESSAGES.SUPPORT.REQUEST_FAILED.code,
                message: "Vui lòng điền đầy đủ thông tin"
            });
        }

        const fullname = `${firstName} ${lastName}`;
        const pool = await getPool();

        // Tìm khách hàng dựa trên email
        const customerCheck = await pool
            .request()
            .input("email", sql.NVarChar, email)
            .query("SELECT cus_id FROM Customer WHERE email = @email");

        let cusId;
        if (customerCheck.recordset.length > 0) {
            // Nếu tìm thấy khách hàng, lấy cus_id
            cusId = customerCheck.recordset[0].cus_id;
        } else {
            // Nếu không tìm thấy, tạo khách hàng mới
            const defaultPassword = "defaultPassword123"; // Mật khẩu mặc định, có thể yêu cầu người dùng đổi sau
            const hashedPassword = await hashPassword(defaultPassword);

            const customerResult = await pool
                .request()
                .input("fullname", sql.NVarChar, fullname)
                .input("email", sql.NVarChar, email)
                .input("password", sql.VarBinary, hashedPassword)
                .input("phone", sql.NVarChar, phone)
                .query(`
            INSERT INTO Customer (fullname, email, password, phone)
            OUTPUT INSERTED.cus_id
            VALUES (@fullname, @email, @password, @phone)
            `);
        }
        // Tạo emp_id mới bằng uuid
        const requestID = uuidv4().replace(/-/g, "").slice(0, 10); // Lấy 10 ký tự đầu của UUID
        // Lưu yêu cầu hỗ trợ vào bảng Customer_Support_Request
        const supportResult = await pool
            .request()
            .input("request_id", sql.NVarChar, requestID)
            .input("cus_id", sql.VarChar, cusId)
            .input("subject", sql.NVarChar, subject)
            .input("message", sql.NVarChar, message)
            .input("status", sql.NVarChar, "PENDING")
            .query(`
            INSERT INTO Customer_Support_Request (request_id, cus_id, subject, message, status)
            VALUES (@request_id, @cus_id, @subject, @message, @status)
        `);

        console.log(`Đã tạo yêu cầu hỗ trợ`);

        return res.status(201).json({
            message: "Yêu cầu hỗ trợ đã được gửi thành công",
        });
    } catch (error) {
        console.error("Lỗi khi gửi yêu cầu hỗ trợ:", error.message);
        return res.status(500).json({
            code: ERROR_MESSAGES.API.SERVER_ERROR.code,
            message: ERROR_MESSAGES.API.SERVER_ERROR.message
        });
    }
};

module.exports = { createSupportRequest };