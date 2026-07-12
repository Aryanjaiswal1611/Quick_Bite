const path = require('path');
const fs = require('fs');

// Load backend/.env first, then fall back to project-root .env for local monorepo setups
const backendEnv = path.join(__dirname, '../.env');
const rootEnv = path.join(__dirname, '../../.env');

if (fs.existsSync(backendEnv)) {
  require('dotenv').config({ path: backendEnv });
} else if (fs.existsSync(rootEnv)) {
  require('dotenv').config({ path: rootEnv });
} else {
  require('dotenv').config();
}

const config = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 8000,
  mongoUri: process.env.MONGO_URI || 'mongodb://localhost:27017/food_delivery',
  jwtSecret: process.env.JWT_SECRET || 'dev_only_jwt_secret_change_me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1d',
  sessionSecret: process.env.SESSION_SECRET || 'dev_only_session_secret_change_me',
  corsOrigin: process.env.CORS_ORIGIN || '*',
  razorpayKeyId: process.env.RAZORPAY_KEY_ID || 'rzp_test_dummyKeyId12345',
  razorpayKeySecret: process.env.RAZORPAY_KEY_SECRET || 'dummyKeySecret1234567890',
  isProduction: process.env.NODE_ENV === 'production',
};

module.exports = config;
