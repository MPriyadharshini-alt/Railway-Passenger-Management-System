const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/railway_platform';

async function connectDB() {
  try {
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000
    });
    console.log(`✅ MongoDB connected: ${mongoose.connection.host}`);
    return true;
  } catch (err) {
    console.error('❌ MongoDB connection failed:', err.message);
    console.error('');
    console.error('To fix this, ensure MongoDB is running:');
    console.error('  • Local: Start MongoDB service or run `mongod`');
    console.error('  • Atlas: Set MONGODB_URI=mongodb+srv://... in server/.env');
    console.error('');
    process.exit(1);
  }
}

module.exports = { connectDB };
