require('dotenv').config();
const jwt = require("jsonwebtoken");


const generateAccessToken = (payload) => {
  return jwt.sign(payload, process.env.ACCESS_TOKEN_SECRECT, { expiresIn: "1d" });
};

const generateRefreshToken = (payload) => {
  return jwt.sign(payload, process.env.REFRESH_TOKEN_SECRECT, { expiresIn: "7d" });
};


const verifyToken = (token) => {
  try {
    return jwt.verify(token, process.env.ACCESS_TOKEN_SECRECT);
  } catch (error) {
    throw new Error('Invalid token');
  }
};

module.exports = { generateAccessToken, generateRefreshToken, verifyToken};