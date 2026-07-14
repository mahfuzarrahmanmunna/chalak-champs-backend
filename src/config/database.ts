// src/config/database.ts
import path from "path";
import mongoose, { ConnectOptions } from "mongoose"; // ✅ Explicit import
import * as dotenv from "dotenv";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const MONGODB_OPTIONS: ConnectOptions = {
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  maxPoolSize: 10,
  retryWrites: true,
  w: "majority" as const,
};

export const connectDB = async (): Promise<void> => {
  try {
    const mongoURI = process.env.MONGODB_URI;
    
    if (!mongoURI) {
      throw new Error("MongoDB URI is not defined in environment variables");
    }

    // Set mongoose options
    mongoose.set("strictQuery", false);
    mongoose.connection.setMaxListeners(20);

    await mongoose.connect(mongoURI, MONGODB_OPTIONS);
    
    console.log("✅ MongoDB connected successfully");
    
    // Handle connection events
    mongoose.connection.on("connected", () => {
      console.log("Mongoose connected to DB");
    });

    mongoose.connection.on("error", (err) => {
      console.error("Mongoose connection error:", err);
    });

    mongoose.connection.on("disconnected", () => {
      console.log("Mongoose disconnected");
    });

  } catch (error) {
    console.error("❌ MongoDB connection error:", error);
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

// Export mongoose instance for status checks
export { mongoose };