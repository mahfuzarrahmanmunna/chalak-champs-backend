// src/config/database.ts
import mongoose from "mongoose";
import * as dotenv from "dotenv";

dotenv.config();

export const connectDB = async (): Promise<void> => {
  try {
    const mongoURI = process.env.MONGODB_URI;
    if (!mongoURI) {
      throw new Error("MongoDB URI is not defined in environment variables");
    }

    // Set mongoose options to avoid warnings
    mongoose.set('strictQuery', false);
    
    // Increase the max listeners to avoid warnings
    mongoose.connection.setMaxListeners(20);

    await mongoose.connect(mongoURI);
    console.log("MongoDB connected successfully");
  } catch (error) {
    console.error("MongoDB connection error:", error);
    process.exit(1);
  }
};

export const disconnectDB = async (): Promise<void> => {
  try {
    await mongoose.disconnect();
    console.log("MongoDB disconnected successfully");
  } catch (error) {
    console.error("MongoDB disconnection error:", error);
  }
};
