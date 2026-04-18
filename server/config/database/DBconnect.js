import mongoose from "mongoose";
import dotenv from 'dotenv';
dotenv.config();

async function dbConnect() {
  try {
    const mongoUri = process.env.MONGO_URI;

    if (!mongoUri) {
      throw new Error(
        "MongoDB connection string (MONGO_URI) is missing in your .env file"
      );
    }

    await mongoose.connect(mongoUri);

    console.log("Successfully connected to MongoDB");
  } catch (error) {
    console.error("Error connecting to MongoDB:", error.message);
    process.exit(1);
  }
}

export default dbConnect;
