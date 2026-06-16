// src/app.ts
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import path from "path";
import dotenv from "dotenv";

import courseRoutes from "./routes/courses";
import authRoutes from "./routes/auth";
// REMOVED: import { connectDB } from "./config/database";
import { errorHandler, notFound } from "./middleware/errorHandler";
import { logger, morganStream } from "./utils/logger";

dotenv.config();

const app = express();

// REMOVED: connectDB();  <-- Do NOT connect here. Let index.ts handle it.

// Middleware
app.use(helmet());
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "https://chalakchamps.com",
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    optionsSuccessStatus: 200,
  }),
);
app.use(morgan("combined", { stream: morganStream }));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Static files
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// Routes
app.use("/api/courses", courseRoutes);
app.use("/api/auth", authRoutes);

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "OK", timestamp: new Date().toISOString() });
});

// Handle 404 errors
app.use(notFound);

// Error handling middleware (must be last)
app.use(errorHandler);

export default app;
