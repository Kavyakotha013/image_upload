import mongoose from 'mongoose';

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 2000
    });
    console.log(`[Database] MongoDB Connected: ${conn.connection.host}`);
    global.useLocalDB = false;
  } catch (error) {
    console.warn(`[Database Warning] MongoDB connection failed: ${error.message}`);
    console.warn(`[Database] Falling back to a local JSON database mode (local_db.json) for standalone execution.`);
    global.useLocalDB = true;
  }
};

export default connectDB;
