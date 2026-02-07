// src/index.ts
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import * as dotenv from "dotenv";
import mongoose from "mongoose";
import authRoutes from "./routes/auth";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(helmet());
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);
app.use(morgan("combined"));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Routes
app.use("/api/auth", authRoutes);

// Error handling middleware
app.use(
  (
    err: Error,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction,
  ) => {
    console.error("Unhandled error:", err);
    res.status(500).json({ message: "Something went wrong!" });
  },
);

// 404 handler
app.use((req, res, next) => {
  res.status(404).json({ message: "Route not found" });
});

// Connect to MongoDB and start server
const startServer = async (): Promise<void> => {
  try {
    // Connect to MongoDB
    const mongoURI = process.env.MONGODB_URI;
    if (!mongoURI) {
      throw new Error("MongoDB URI is not defined in environment variables");
    }

    mongoose.set("strictQuery", false);
    await mongoose.connect(mongoURI);
    console.log("MongoDB connected successfully");

    // Start server
    app.listen(PORT, () => {
      console.log(`✅ Server is running on port ${PORT}`);
    });
  } catch (error: any) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

startServer();
