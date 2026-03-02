// src/index.ts
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import * as dotenv from "dotenv";
import mongoose from "mongoose";
import authRoutes from "./routes/auth";
import courseRoutes from "./routes/courses";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
// Log every request path to terminal so you can see which path was hit
app.use((req, res, next) => {
  console.log(`>>> ${req.method} ${req.originalUrl || req.path}`);
  next();
});
app.use(morgan("combined"));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/courses", courseRoutes);

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
  const allowStartWithoutDb = process.env.ALLOW_START_WITHOUT_DB === "true";

  const mongoURI = process.env.MONGODB_URI;
  if (!mongoURI) {
    console.error("MongoDB URI is not defined in .env");
    if (!allowStartWithoutDb) process.exit(1);
  } else {
    try {
      mongoose.set("strictQuery", false);
      await mongoose.connect(mongoURI);
      console.log("MongoDB connected successfully");
    } catch (error: any) {
      console.error("MongoDB connection failed:", error?.message || error);
      if (error?.name === "MongooseServerSelectionError" || error?.message?.includes("whitelist")) {
        console.error("\n--- MongoDB Atlas: whitelist your IP ---");
        console.error("  https://cloud.mongodb.com → Network Access → Add IP Address (or 0.0.0.0/0 for dev)");
        console.error("  Or use local MongoDB: MONGODB_URI=mongodb://localhost:27017/langual-academy\n");
      }
      if (!allowStartWithoutDb) {
        process.exit(1);
      }
      console.warn("⚠️  Server starting WITHOUT database (ALLOW_START_WITHOUT_DB=true). API routes that need DB will fail.\n");
    }
  }

  app.listen(PORT, () => {
    console.log(`✅ Server is running on port ${PORT}`);
  });
};

startServer();
