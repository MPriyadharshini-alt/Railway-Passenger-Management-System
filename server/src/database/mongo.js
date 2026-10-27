const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || (
  process.env.NODE_ENV === 'production' ? null : 'mongodb://127.0.0.1:27017/railway_platform'
);
let connectionPromise;

async function connectDB() {
  if (!MONGODB_URI) {
    throw new Error('MONGODB_URI must be configured in production.');
  }
  if (mongoose.connection.readyState === 1) return true;

  if (!connectionPromise) {
    connectionPromise = mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      maxPoolSize: 5
    })
      .then(() => {
        console.log(`MongoDB connected: ${mongoose.connection.host}`);
        return true;
      })
      .catch((err) => {
        console.error('MongoDB connection failed:', err.message);
        throw err;
      })
      .finally(() => {
        connectionPromise = null;
      });
  }

  return connectionPromise;
}

module.exports = { connectDB };
