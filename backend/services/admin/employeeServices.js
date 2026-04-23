const { sql, getPool } = require("../../config/db");
const ERROR_MESSAGES = require("../../utils/errorConstants");
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcrypt');

const hashPassword = async (password) => {
  const saltRounds = 10;
  return await bcrypt.hash(password, saltRounds);
};

// Lấy nhân viên phân trang + lọc status
const getEmployeesByPageAndStatus = async (page, pageSize) => {
    const pool = await getPool();
    const offset = (page - 1) * pageSize;
  
    const result = await pool.request()
      .input("offset", offset)
      .input("pageSize", pageSize)
      .query(`
        SELECT 
        e.emp_id,
        e.fullname,
        e.role_id,
        e.email,
        e.phone,
        e.address,
        e.em_status,
        e.branch_id,
        FORMAT(e.hire_day, 'yyyy-MM-dd') as hire_day,
        r.role_name,
        b.branch_name
        FROM Employee e
        LEFT JOIN Branch b
          ON e.branch_id = b.branch_id
        LEFT JOIN Employee_Role r
           ON e.role_id = r.role_id  
        ORDER BY e.emp_id
        OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY
      `);
  
    // Lấy tổng số nhân viên
    const countResult = await pool.request().query(`
      SELECT COUNT(*) as total FROM Employee
      `);
  
    return {
      employees: result.recordset,
      total: countResult.recordset[0].total
    };
};

// Lấy thông tin nhân viên theo ID
const getEmployeeById = async (emp_id) => {
    const pool = await getPool();
    const result = await pool.request()
      .input("emp_id", sql.VarChar, emp_id)
      .query(`SELECT * FROM Employee WHERE emp_id = @emp_id`);
    return result.recordset[0];
};


// Khóa nhân viên theo danh sách ID
const lockEmployeesByIds = async (ids) => {
  if (!Array.isArray(ids) || ids.length === 0) {
    throw new Error("Danh sách IDs không hợp lệ");
  }
  const pool = await getPool();
  const request = pool.request();
  // Tạo tham số động: @id0,@id1,...
  const placeholders = ids.map((_, i) => `@id${i}`).join(",");
  ids.forEach((id, i) => {
    request.input(`id${i}`, sql.VarChar, id);
  });
  const result = await request.query(`
    UPDATE Employee
    SET em_status = 'inactive'
    WHERE emp_id IN (${placeholders})
  `);
  // rowsAffected[0] = số dòng bị update
  return result.rowsAffected[0];
};

// Khóa nhân viên theo danh sách ID
const unlockEmployeesByIds = async (ids) => {
  if (!Array.isArray(ids) || ids.length === 0) {
    throw new Error("Danh sách IDs không hợp lệ");
  }
  const pool = await getPool();
  const request = pool.request();
  // Tạo tham số động: @id0,@id1,...
  const placeholders = ids.map((_, i) => `@id${i}`).join(",");
  ids.forEach((id, i) => {
    request.input(`id${i}`, sql.VarChar, id);
  });
  const result = await request.query(`
    UPDATE Employee
    SET em_status = 'active'
    WHERE emp_id IN (${placeholders})
  `);
  // rowsAffected[0] = số dòng bị update
  return result.rowsAffected[0];
};

const createEmployee = async ({ fullname, email, password, phone, address, role_id, branch_id }) => {
    const emp_id = uuidv4().replace(/-/g, "").slice(0, 10);
    const hire_day = new Date().toISOString().slice(0, 10);
    const em_status = 'active';
    const hashedPassword =Buffer.from( await hashPassword(password)); // dùng bcrypt
    const pool = await getPool();
    await pool.request()
      .input('emp_id', sql.VarChar, emp_id)
      .input('branch_id', sql.Int, branch_id)
      .input('fullname', sql.NVarChar, fullname)
      .input('email', sql.NVarChar, email)
      .input('password', sql.VarBinary, hashedPassword)
      .input('phone', sql.NVarChar, phone)
      .input('address', sql.NVarChar, address)
      .input('role_id', sql.Int, role_id)
      .input('hire_day', sql.Date, hire_day)
      .input('em_status', sql.NVarChar, em_status)
      .query(`INSERT INTO Employee (emp_id, branch_id, fullname, email, password, phone, address, role_id, hire_day, em_status)
              VALUES (@emp_id, @branch_id, @fullname, @email, @password, @phone, @address, @role_id, @hire_day, @em_status)`);
};

 // Update thông tin nhân viên 
const updateEmployee = async (emp_id, { fullname, email, password, phone, address, role_id, branch_id }) => {
    const hashedPassword = Buffer.from(await hashPassword(password));
    const pool = await getPool();
    await pool.request()
      .input('emp_id', sql.VarChar, emp_id)
      .input('fullname', sql.NVarChar, fullname)
      .input('email', sql.NVarChar, email)
      .input('password', sql.VarBinary, hashedPassword)
      .input('phone', sql.NVarChar, phone)
      .input('address', sql.NVarChar, address)
      .input('role_id', sql.Int, role_id)
      .input('branch_id', sql.Int, branch_id)
      .query(`UPDATE Employee
              SET fullname = @fullname, email = @email, password = @password, phone = @phone, address = @address, role_id = @role_id, branch_id = @branch_id
              WHERE emp_id = @emp_id`);
}; 

module.exports = {
  getEmployeesByPageAndStatus,
  getEmployeeById,
  lockEmployeesByIds,
  unlockEmployeesByIds,
  createEmployee,
  updateEmployee
}; 