const dashboardServices = require("../../services/admin/dashboardServices");

const getOverviewStats = async (req, res) => {
  try {
    const stats = await dashboardServices.getOverviewStats();
    res.status(200).json(stats);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getTourChartData = async (req, res) => {
  try {
    const chart = await dashboardServices.getTourChartData();
    res.status(200).json(chart);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getRecentTransactions = async (req, res) => {
  try {
    const transactions = await dashboardServices.getRecentTransactions();
    res.status(200).json(transactions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getOverviewStats, getTourChartData, getRecentTransactions };