const mongoose = require('mongoose');

/**
 * Connect to MongoDB Atlas with retry logic.
 * Uses the MONGODB_URI from environment variables.
 */
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log(`✅ MongoDB connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌ MongoDB connection error: ${error.message}`);
    console.log('🔄 Retrying connection in 5 seconds...');
    // Wait 5 seconds, then try again, recursively blocking resolution until connected
    await new Promise((resolve) => setTimeout(resolve, 5000));
    return connectDB();
  }
};

module.exports = connectDB;
