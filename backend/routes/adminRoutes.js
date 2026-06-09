// routes/adminRoutes.js
const express = require('express');

const router = express.Router();

// Import middleware
const { authMiddleware, restrictTo } = require('../middlewares/authMiddlewares');

// Apply auth to all admin routes
router.use(authMiddleware);
router.use(restrictTo('Admin'));

// Import controllers
const { getOverviewStats, getTourChartData, getRecentTransactions } = require('../controller/admin/dashboardControllers');
const { approveTourById, rejectTourById, updateTourStatus, getToursByStatusAndPage } = require('../controller/admin/tourManagementControllers');
const { getEmployeesByPageAndStatus, getEmployeeById, lockEmployeesByIds, unlockEmployeesByIds, createEmployee, updateEmployee } = require('../controller/admin/employeeController');
const { getBranchStats, getBranch, createBranch, getBranchDetail} = require('../controller/admin/branchManagementControllers');

router.get('/overview', getOverviewStats);

router.get('/branches', getBranchStats);

router.get('/chart', getTourChartData);

router.get('/transactions', getRecentTransactions);

router.get('/employeeFilter', getEmployeesByPageAndStatus);

router.get('/getBranch', getBranch);

router.get('/tours', getToursByStatusAndPage);

router.put('/tours/:id/approve', approveTourById);

router.put('/tours/:id/reject', rejectTourById);

router.put('/employees/lock', lockEmployeesByIds);

router.put('/employees/unlock', unlockEmployeesByIds);

router.post('/branches', createBranch);

router.post('/employees', createEmployee);

router.get("/employees/:id", getEmployeeById);

router.get("/branches/:id", getBranchDetail);

router.put("/employees/update/:id", updateEmployee);

router.put('/tours/update-status', async (req, res) => {
  try {
    await updateTourStatus();
    res.json({ message: 'Cập nhật trạng thái tour thành công' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
