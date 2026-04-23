const employeeServices = require("../../services/admin/employeeServices");

const getEmployeesByPageAndStatus = async (req, res) => {
  try {
  const { page, pageSize } = req.query;
    const data = await employeeServices.getEmployeesByPageAndStatus(Number(page), Number(pageSize));
    res.status(200).json(data);
  } catch (error) {
    console.error("Lỗi khi lấy danh sách nhân viên:", error);
    res.status(500).json({ error: error.message });
  }
};

const getEmployeeById = async (req, res) => {
  try {
    const data = await employeeServices.getEmployeeById(req.params.id);
    res.status(200).json(data);
  } catch (error) {
    console.error("Lỗi khi lấy thông tin nhân viên:", error);
    res.status(500).json({ error: error.message });
  }
};

const lockEmployeesByIds = async (req, res) => {
  try {
  const { ids } = req.body;
    const count = await employeeServices.lockEmployeesByIds(ids);
    res.status(200).json({ message: `Đã khóa ${count} nhân viên thành công` });
  } catch (error) {
    console.error("Lỗi khi khóa nhân viên:", error);
    res.status(500).json({ error: error.message });
  }
};

const unlockEmployeesByIds = async (req, res) => {
  try {
  const { ids } = req.body;
    const count = await employeeServices.unlockEmployeesByIds(ids);
    res.status(200).json({ message: `Đã mở khoá ${count} nhân viên thành công` });
  } catch (error) {
    console.error("Lỗi khi mở khoá nhân viên:", error);
    res.status(500).json({ error: error.message });
  }
};

const createEmployee = async (req, res) => {
  try {
    const { fullname, email, password, phone, address, role_id, branch_id } = req.body;
    await employeeServices.createEmployee({ fullname, email, password, phone, address, role_id, branch_id });
    res.status(201).json({ message: 'Tạo nhân viên thành công' });
  } catch (error) {
    console.error("Lỗi khi tạo nhân viên:", error);
    res.status(500).json({ error: error.message });
  }
};

const updateEmployee = async (req, res) => {
  try {
    const emp_id = req.params.id;
    const { fullname, email, password, phone, address, role_id, branch_id } = req.body;
    await employeeServices.updateEmployee(emp_id, { fullname, email, password, phone, address, role_id, branch_id });
    res.status(200).json({ message: 'Cập nhật thông tin nhân viên thành công' });
  } catch (error) {
    console.error("Lỗi khi cập nhật nhân viên:", error);
    res.status(500).json({ error: error.message });
  }
};

module.exports = { 
  getEmployeesByPageAndStatus, 
  getEmployeeById, 
  lockEmployeesByIds, 
  unlockEmployeesByIds, 
  createEmployee, 
  updateEmployee 
};