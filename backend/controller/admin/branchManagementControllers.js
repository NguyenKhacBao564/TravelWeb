const branchManagementServices = require("../../services/admin/branchManagementServices");

const getBranchStats = async (req, res) => {
  try {
    const stats = await branchManagementServices.getBranchStats();
    res.status(200).json(stats);
  } catch (error) {
    console.error("Lỗi khi lấy thống kê chi nhánh:", error);
    res.status(500).json({ error: error.message });
  }
};

const getBranch = async (req, res) => {
  try {
    const branches = await branchManagementServices.getBranch();
    res.status(200).json(branches);
  } catch (error) {
    console.error("Lỗi khi lấy danh sách chi nhánh:", error);
    res.status(500).json({ error: error.message });
  }
};

const createBranch = async (req, res) => {
  try {
    const { branch_name, address, phone } = req.body;
    await branchManagementServices.createBranch({ branch_name, address, phone });
    res.status(201).json({ message: 'Tạo chi nhánh thành công' });
  } catch (error) {
    console.error("Lỗi khi tạo chi nhánh:", error);
    res.status(500).json({ error: error.message });
  }
};

const getBranchDetail = async (req, res) => {
  try {
    const branchId = req.params.id;
    const year = req.query.year ? parseInt(req.query.year, 10) : new Date().getFullYear();
    const data = await branchManagementServices.getBranchDetail(branchId, year);
    res.status(200).json(data);
  } catch (error) {
    console.error("Lỗi khi lấy chi tiết chi nhánh:", error);
    res.status(500).json({ error: error.message });
  }
};


module.exports = {
  getBranchStats,
  getBranch,
  createBranch,
  getBranchDetail
};
