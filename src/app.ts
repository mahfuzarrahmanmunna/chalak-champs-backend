import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import * as dotenv from "dotenv";
import authRoutes from "./routes/auth";

dotenv.config();

const app = express();

// Middleware
app.use(helmet());
// Configure CORS to allow requests from your frontend
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
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

// 404 handler - Use a proper middleware function instead of wildcard route
app.use((req, res, next) => {
  res.status(404).json({ message: "Route not found" });
});

export default app;
