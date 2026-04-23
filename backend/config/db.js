require('dotenv').config();
const sql = require('mssql');

const dbConfig = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER,
  database: process.env.DB_DATABASE,
  port: parseInt(process.env.DB_PORT),
  options: {
    encrypt: false,
    trustServerCertificate: true,
  },
};

let poolPromise;

async function getPool() {
  if (!poolPromise) {
    try {
      poolPromise = await sql.connect(dbConfig);
      console.log('✅ Kết nối DB MSSQL thành công');
    } catch (err) {
      console.error('❌ Lỗi kết nối DB:', err);
      throw err;
    }
  }
  return poolPromise;
}

module.exports = {
  sql,
  getPool
};