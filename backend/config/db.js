const mongoose = require('mongoose');
const config = require('./env');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(config.mongoUri);
    // eslint-disable-next-line no-console
    console.log(`MongoDB connected: ${conn.connection.host}/${conn.connection.name}`);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('========== MongoDB Connection Error ==========');
    console.error('URI prefix:', (config.mongoUri || '').substring(0, 20) + '...');
    console.error('Error name:', err.name);
    console.error('Error message:', err.message);
    console.error('Full error:', err);
    console.error('==============================================');
    // THROW instead of process.exit so the caller (app.js) can decide what to do.
    // The server will still start but DB operations will fail gracefully.
    throw err;
  }
};

module.exports = connectDB;
