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
import ProductOrderRoutes from "./routes/ProductOrderRoutes";
import { AppError } from "./middleware/errorHandler";
import manualPaymentRoutes from "./routes/manualPaymentRoutes";
import progressRoutes from "./routes/progressRoutes";
import contactRoutes from "./routes/contactRoutes";

// ✅ NEW IMPORT
import galleryRoutes from "./routes/galleryRoutes";
import trackingSettingsRoutes from "./routes/trackingSettings";
import admissionsRoutes from "./routes/admissions";
import teacherAdminRoutes from "./routes/teacherAdminRoutes";
import teacherPublicRoutes from "./routes/teacherPublicRoutes";


export function createExpressApp() {
  const app = express();

  // ==========================================
  // 1. SECURITY & LOGGING
  // ==========================================
  app.use(helmet());
  app.use(morgan("dev"));

  // ==========================================
  // 2. CORS CONFIGURATION
  // ==========================================
  const allowedOrigins = [
    process.env.FRONTEND_URL || "https://chalakchamps.com",
    "http://127.0.0.1:3000",
    "https://www.chalakchamps.com",
    "https://localhost:3000",
    "http://localhost:3000",
    "https://127.0.0.1:3000",
    "https://chalakchamps.vercel.app",
    "https://80a25253.chalakchamps-v2.pages.dev",
  ].filter((origin): origin is string => Boolean(origin));

  const isDevelopment = process.env.NODE_ENV !== "production";
  const allowLocalhost =
    process.env.ALLOW_LOCALHOST_ORIGINS === "true" || isDevelopment;

  if (allowLocalhost) {
    allowedOrigins.push(
      "http://localhost:3000",
      "http://127.0.0.1:3000",
      "https://localhost:3000",
      "https://127.0.0.1:3000",
    );
  }

  // ✅ FIX 1: Custom CORS middleware — added PATCH to allowed methods
  app.use((req, res, next) => {
    const origin = req.headers.origin as string | undefined;
    if (allowLocalhost || !origin || allowedOrigins.includes(origin)) {
      res.setHeader("Access-Control-Allow-Origin", origin || "*");
    }
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader(
      "Access-Control-Allow-Methods",
      "GET, POST, PUT, PATCH, DELETE, OPTIONS",  // ✅ ADDED PATCH
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

  // ✅ FIX 2: cors() middleware — added PATCH to methods array
  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin || allowLocalhost) return callback(null, true);
        if (allowedOrigins.includes(origin)) return callback(null, true);
        console.warn(`[CORS] Blocked origin: ${origin}`);
        return callback(
          new Error(`CORS policy does not allow access from origin ${origin}`),
        );
      },
      credentials: true,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],  // ✅ ADDED PATCH
      allowedHeaders: ["Content-Type", "Authorization"],
      optionsSuccessStatus: 200,
    }),
  );

  // ==========================================
  // 3. STATIC FILES
  // ==========================================
  app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

  // ==========================================
  // 4. DATABASE CONNECTION MIDDLEWARE
  // ==========================================
  app.use("/api", async (req, res, next) => {
    const requestStartedAt = Date.now();
    let dbConnectMs: number | null = null;
    let dbConnectStartedAt = requestStartedAt;

    res.once("finish", () => {
      console.info(
        JSON.stringify({
          event: "api_request",
          method: req.method,
          route: req.route?.path ? String(req.route.path) : "unmatched",
          status: res.statusCode,
          durationMs: Date.now() - requestStartedAt,
          dbConnectMs,
        }),
      );
    });

    try {
      dbConnectStartedAt = Date.now();
      await ensureMongoConnected();
      dbConnectMs = Date.now() - dbConnectStartedAt;
      next();
    } catch (e) {
      dbConnectMs = Date.now() - dbConnectStartedAt;
      next(e);
    }
  });

  // ==========================================
  // 5. BODY PARSERS (MUST BE BEFORE ALL API ROUTES!)
  // ==========================================
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true, limit: "10mb" }));

  // ==========================================
  // 6. API ROUTES
  // ==========================================
  app.use("/api/products", productRoutes);
  app.use("/api/courses", courseRoutes);
  app.use("/api/admin", adminRoutes); // ✅ Only declared ONCE, after body parsers
  app.use("/api/admin/admissions", admissionsRoutes);
  app.use("/api/tracking-settings", trackingSettingsRoutes);
  app.use("/api/auth", authRoutes);
  app.use("/api/contact", contactSheetRoutes);
  app.use("/api/freebooking", freeBookingRoutes);
  app.use("/api/freebookingprops", freeBookingRoutes);
  app.use("/api/exam", examRoutes);
  app.use("/api/enrollment", enrollmentRoutes);
  app.use("/api/enrollments", enrollmentRoutes);
  app.use("/api/cta", ctaRoutes);
  app.use("/api/orders", orderRoutes);
  app.use("/api/promo", promoRoutes);
  app.use("/api/hero", heroRoutes);
  app.use("/api/feature-courses-banner", featureCoursesBannerRoutes);
  app.use("/api/video-gallery", videoGalleryRoutes);
  app.use("/api/product-orders", ProductOrderRoutes);
  app.use("/api/manual-payment", manualPaymentRoutes);
  app.use("/api/manual-payments", manualPaymentRoutes);
  app.use("/api/courses", progressRoutes);
  app.use("/api/contact", contactRoutes);

  // NEW GALLERY ROUTE ADDED HERE
  app.use("/api/gallery", galleryRoutes);
  app.use("/api/admin/teachers", teacherAdminRoutes);
  app.use("/api/teachers", teacherPublicRoutes);

  // ==========================================
  // 7. HEALTH & ROOT ROUTES
  // ==========================================
  app.get("/health", (req, res) => {
    res.json({
      status: "OK",
      timestamp: new Date(),
      uptime: process.uptime(),
    });
  });

  app.get("/", (req, res) => {
    res.json({
      success: true,
      message: "Chalak Champs API Running 🚀",
      version: "1.0.0",
    });
  });

  // ==========================================
  // 8. 404 HANDLER
  // ==========================================
  app.use((req, res) => {
    res.status(404).json({
      success: false,
      message: `Route not found: ${req.method} ${req.path}`,
    });
  });

  // ==========================================
  // 9. GLOBAL ERROR HANDLER
  // ==========================================
  app.use(
    (
      err: unknown,
      req: express.Request,
      res: express.Response,
      _next: express.NextFunction,
    ) => {
      console.error("=== SERVER ERROR ===");
      console.error("Path:", req.method, req.path);
      console.error("Error:", err);
      console.error("======================");

      const message =
        err instanceof Error ? err.message : "Internal Server Error";
      const statusCode =
        err instanceof AppError
          ? err.statusCode
          : err instanceof Error && err.message.includes("CORS")
            ? 403
            : 500;

      const origin = req.headers.origin as string | undefined;
      if (allowLocalhost || !origin || allowedOrigins.includes(origin || "")) {
        res.setHeader("Access-Control-Allow-Origin", origin || "*");
      }

      res.status(statusCode).json({
        success: false,
        message,
        ...(process.env.NODE_ENV === "development" && {
          stack: err instanceof Error ? err.stack : undefined,
        }),
      });
    },
  );

  return app;
}