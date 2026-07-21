// src/expressApp.ts

import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import path from "path";
import authRoutes from "./routes/auth";
import courseRoutes from "./routes/courses";
import adminRoutes from "./routes/admin";
import contactSheetRoutes from "./routes/contactSheet";
import freeBookingRoutes from "./routes/freeBookingRoutes";
import examRoutes from "./routes/examRoutes";
import enrollmentRoutes from "./routes/enrollmentRoutes";
import { ensureMongoConnected } from "./db/mongo";
import ctaRoutes from "./routes/ctaRoutes";
import productRoutes from "./routes/products";
import orderRoutes from "./routes/orderRoutes";
import promoRoutes from "./routes/promoRoutes";
import heroRoutes from "./routes/heroRoutes";
import featureCoursesBannerRoutes from "./routes/featureCoursesBannerRoutes";
import videoGalleryRoutes from "./routes/videoGalleryRoute";

/**
 * Builds the Express app (middleware + routes) without calling listen().
 */
export function createExpressApp() {
  const app = express();

  // ==========================================
  // 1. SECURITY & PARSING (Must be first)
  // ==========================================
  app.use(helmet());
  app.use(morgan("dev"));
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true, limit: "10mb" }));

  // ==========================================
  // 2. CORS CONFIGURATION (Must be before DB check)
  // ==========================================
  const localOrigins = [
    "https://chalakchamps.com",
    "http://127.0.0.1:3000",
    "https://localhost:3000",
    "http://localhost:3000",
    "https://127.0.0.1:3000",
  ];

  const allowedOrigins = [
    process.env.FRONTEND_URL || "https://chalakchamps.com", 
    "http://127.0.0.1:3000",
    "https://localhost:3000",
    "http://localhost:3000",
    "https://127.0.0.1:3000",
    "https://chalakchamps.vercel.app",
  ].filter((origin): origin is string => Boolean(origin));

  const isDevelopment = process.env.NODE_ENV !== "production";
  const allowLocalhost =
    process.env.ALLOW_LOCALHOST_ORIGINS === "true" || isDevelopment;

  if (allowLocalhost) {
    allowedOrigins.push(...localOrigins);
  }

  app.use((req, res, next) => {
    const origin = req.headers.origin as string | undefined;
    if (allowLocalhost || !origin) {
      res.setHeader("Access-Control-Allow-Origin", origin || "*");
    } else if (origin && allowedOrigins.includes(origin)) {
      res.setHeader("Access-Control-Allow-Origin", origin);
    }
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader(
      "Access-Control-Allow-Methods",
      "GET,POST,PUT,DELETE,OPTIONS",
    );
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization",
    );
    if (req.method === "OPTIONS") {
      return res.sendStatus(200);
    }
    next();
  });

  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin) {
          return callback(null, true);
        }
        if (allowLocalhost) {
          return callback(null, true);
        }
        if (allowedOrigins.includes(origin)) {
          return callback(null, true);
        }
        return callback(
          new Error(`CORS policy does not allow access from origin ${origin}`),
        );
      },
      credentials: true,
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
      optionsSuccessStatus: 200,
    }),
  );

  // ==========================================
  // 3. STATIC FILES
  // ==========================================
  app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

  // ==========================================
  // 4. DATABASE CONNECTION (Moved here, AFTER CORS)
  // ==========================================
  app.use("/api", async (req, _res, next) => {
    try {
      await ensureMongoConnected();
      next();
    } catch (e) {
      next(e);
    }
  });

  // ==========================================
  // 5. ROUTES
  // ==========================================
  app.use("/api/auth", authRoutes);
  app.use("/auth", authRoutes);
  app.use("/api/courses", courseRoutes);
  app.use("/api/admin", adminRoutes);
  app.use("/api/contact", contactSheetRoutes);
  app.use("/api/freebooking", freeBookingRoutes);
  app.use("/api/freebookingprops", freeBookingRoutes);
  app.use("/api/exam", examRoutes);
  app.use("/api/enrollments", enrollmentRoutes);
  app.use("/api/cta", ctaRoutes);
  app.use("/api/products", productRoutes);
  app.use("/api/orders", orderRoutes);
  app.use("/api/promo", promoRoutes);
  app.use("/api/hero", heroRoutes);
  app.use("/api/feature-courses-banner", featureCoursesBannerRoutes);
  app.use("/api/video-gallery", videoGalleryRoutes);

  // ==========================================
  // 6. HEALTH & ROOT ROUTES
  // ==========================================
  app.get("/health", (req, res) => {
    res.json({ status: "OK", timestamp: new Date() });
  });

  app.get("/", (req, res) => {
    res.json({
      success: true,
      message: "Chalak Champs API Running 🚀",
    });
  });

  // ==========================================
  // 7. 404 HANDLER
  // ==========================================
  app.use((req, res) => {
    res.status(404).json({ message: "Route not found" });
  });

  // ==========================================
  // 8. GLOBAL ERROR HANDLER (Includes CORS so errors are visible)
  // ==========================================
  app.use(
    (
      err: unknown,
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction,
    ) => {
      console.error("Server Error:", err);
      const message =
        err instanceof Error ? err.message : "Internal Server Error";
      
      // Add CORS headers to errors so the frontend can actually read the error message
      const origin = _req.headers.origin as string | undefined;
      if (allowLocalhost || !origin || allowedOrigins.includes(origin || "")) {
        res.setHeader("Access-Control-Allow-Origin", origin || "*");
      }

      res.status(500).json({ message });
    },
  );

  return app;
}