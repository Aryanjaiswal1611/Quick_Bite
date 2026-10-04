const mongoose = require('mongoose');
const config = require('./env');

mongoose.set('bufferCommands', false);

let isConnected = false;

const connectDB = async () => {
  if (isConnected) {
    console.log('MongoDB: Already connected');
    return mongoose.connection;
  }

  const mongoUri = config.mongoUri;

  if (!mongoUri) {
    throw new Error('MONGO_URI is not configured. Add a valid MongoDB Atlas or local MongoDB connection string.');
  }

  if (mongoUri.includes('localhost') || mongoUri.includes('127.0.0.1')) {
    console.warn('MongoDB: Using a local MongoDB connection string for development.');
  }

  console.log('MongoDB: Connecting...');

  try {
    const conn = await mongoose.connect(mongoUri, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      family: 4,
      retryWrites: true,
    });

    isConnected = true;
    console.log(`MongoDB: Connected successfully to ${conn.connection.host}/${conn.connection.name}`);

    mongoose.connection.on('error', (err) => {
      console.error('MongoDB: Connection error:', err.message);
      isConnected = false;
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('MongoDB: Disconnected');
      isConnected = false;
    });

    mongoose.connection.on('reconnected', () => {
      console.log('MongoDB: Reconnected');
      isConnected = true;
    });

    return conn;
  } catch (err) {
    isConnected = false;
    const safeUri = mongoUri ? mongoUri.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@') : 'undefined';
    console.error('MongoDB: Connection failed.');
    console.error('URI:', safeUri);
    console.error('Error:', err.message);
    throw err;
  }
};

const getConnectionStatus = () => ({
  isConnected,
  readyState: mongoose.connection.readyState,
  host: mongoose.connection.host,
  name: mongoose.connection.name,
});

module.exports = { connectDB, getConnectionStatus };
