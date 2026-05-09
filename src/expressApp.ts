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
import { ensureMongoConnected } from "./db/mongo";

/**
 * Builds the Express app (middleware + routes) without calling listen().
 * Mongo is ensured on each request — readyState checks are cheap once connected.
 */
export function createExpressApp() {
  const app = express();

  app.use(async (_req, _res, next) => {
    try {
      await ensureMongoConnected();
      next();
    } catch (e) {
      next(e);
    }
  });

  app.use(helmet());
  app.use(
    cors({
      origin: process.env.FRONTEND_URL || "http://localhost:3000",
      credentials: true,
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
    }),
  );
  app.use(morgan("dev"));
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true, limit: "10mb" }));

  // Use cwd so this works after bundling for Cloudflare Workers (no __dirname in ESM bundles).
  app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

  app.use("/api/auth", authRoutes);
  app.use("/api/courses", courseRoutes);
  app.use("/api/admin", adminRoutes);
  app.use("/api/contact", contactSheetRoutes);
  app.use("/api/freebooking", freeBookingRoutes);
  app.use("/api/freebookingprops", freeBookingRoutes);

  app.get("/health", (req, res) => {
    res.json({ status: "OK", timestamp: new Date() });
  });

  app.use((req, res) => {
    res.status(404).json({ message: "Route not found" });
  });

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
      res.status(500).json({ message });
    },
  );

  return app;
}
