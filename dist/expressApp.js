"use strict";
// src/expressApp.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createExpressApp = createExpressApp;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const path_1 = __importDefault(require("path"));
const auth_1 = __importDefault(require("./routes/auth"));
const courses_1 = __importDefault(require("./routes/courses"));
const admin_1 = __importDefault(require("./routes/admin"));
const contactSheet_1 = __importDefault(require("./routes/contactSheet"));
const freeBookingRoutes_1 = __importDefault(require("./routes/freeBookingRoutes"));
const examRoutes_1 = __importDefault(require("./routes/examRoutes"));
const enrollmentRoutes_1 = __importDefault(require("./routes/enrollmentRoutes"));
const mongo_1 = require("./db/mongo");
const ctaRoutes_1 = __importDefault(require("./routes/ctaRoutes"));
const products_1 = __importDefault(require("./routes/products"));
const orderRoutes_1 = __importDefault(require("./routes/orderRoutes"));
const promoRoutes_1 = __importDefault(require("./routes/promoRoutes"));
const heroRoutes_1 = __importDefault(require("./routes/heroRoutes"));
const featureCoursesBannerRoutes_1 = __importDefault(require("./routes/featureCoursesBannerRoutes"));
const videoGalleryRoute_1 = __importDefault(require("./routes/videoGalleryRoute"));
const ProductOrderRoutes_1 = __importDefault(require("./routes/ProductOrderRoutes"));
const errorHandler_1 = require("./middleware/errorHandler");
const manualPaymentRoutes_1 = __importDefault(require("./routes/manualPaymentRoutes"));
const progressRoutes_1 = __importDefault(require("./routes/progressRoutes"));
const contactRoutes_1 = __importDefault(require("./routes/contactRoutes"));
// ✅ NEW IMPORT
const galleryRoutes_1 = __importDefault(require("./routes/galleryRoutes"));
function createExpressApp() {
    const app = (0, express_1.default)();
    // ==========================================
    // 1. SECURITY & LOGGING
    // ==========================================
    app.use((0, helmet_1.default)());
    app.use((0, morgan_1.default)("dev"));
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
    ].filter((origin) => Boolean(origin));
    const isDevelopment = process.env.NODE_ENV !== "production";
    const allowLocalhost = process.env.ALLOW_LOCALHOST_ORIGINS === "true" || isDevelopment;
    if (allowLocalhost) {
        allowedOrigins.push("http://localhost:3000", "http://127.0.0.1:3000", "https://localhost:3000", "https://127.0.0.1:3000");
    }
    app.use((req, res, next) => {
        const origin = req.headers.origin;
        if (allowLocalhost || !origin || allowedOrigins.includes(origin)) {
            res.setHeader("Access-Control-Allow-Origin", origin || "*");
        }
        res.setHeader("Access-Control-Allow-Credentials", "true");
        res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
        res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
        if (req.method === "OPTIONS") {
            return res.sendStatus(200);
        }
        next();
    });
    app.use((0, cors_1.default)({
        origin: (origin, callback) => {
            if (!origin || allowLocalhost)
                return callback(null, true);
            if (allowedOrigins.includes(origin))
                return callback(null, true);
            console.warn(`[CORS] Blocked origin: ${origin}`);
            return callback(new Error(`CORS policy does not allow access from origin ${origin}`));
        },
        credentials: true,
        methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization"],
        optionsSuccessStatus: 200,
    }));
    // ==========================================
    // 3. STATIC FILES
    // ==========================================
    app.use("/uploads", express_1.default.static(path_1.default.join(process.cwd(), "uploads")));
    // ==========================================
    // 4. DATABASE CONNECTION MIDDLEWARE
    // ==========================================
    app.use("/api", async (req, _res, next) => {
        try {
            await (0, mongo_1.ensureMongoConnected)();
            next();
        }
        catch (e) {
            next(e);
        }
    });
    // ==========================================
    // 5. BODY PARSERS (MUST BE BEFORE ALL API ROUTES!)
    // ==========================================
    app.use(express_1.default.json({ limit: "10mb" }));
    app.use(express_1.default.urlencoded({ extended: true, limit: "10mb" }));
    // ==========================================
    // 6. API ROUTES
    // ==========================================
    app.use("/api/products", products_1.default);
    app.use("/api/courses", courses_1.default);
    app.use("/api/admin", admin_1.default); // ✅ Only declared ONCE, after body parsers
    app.use("/api/auth", auth_1.default);
    app.use("/api/contact", contactSheet_1.default);
    app.use("/api/freebooking", freeBookingRoutes_1.default);
    app.use("/api/freebookingprops", freeBookingRoutes_1.default);
    app.use("/api/exam", examRoutes_1.default);
    app.use("/api/enrollment", enrollmentRoutes_1.default);
    app.use("/api/enrollments", enrollmentRoutes_1.default);
    app.use("/api/cta", ctaRoutes_1.default);
    app.use("/api/orders", orderRoutes_1.default);
    app.use("/api/promo", promoRoutes_1.default);
    app.use("/api/hero", heroRoutes_1.default);
    app.use("/api/feature-courses-banner", featureCoursesBannerRoutes_1.default);
    app.use("/api/video-gallery", videoGalleryRoute_1.default);
    app.use("/api/product-orders", ProductOrderRoutes_1.default);
    app.use("/api/manual-payment", manualPaymentRoutes_1.default);
    app.use("/api/manual-payments", manualPaymentRoutes_1.default);
    app.use("/api/courses", progressRoutes_1.default);
    app.use("/api/contact", contactRoutes_1.default);
    // ✅ NEW GALLERY ROUTE ADDED HERE
    app.use("/api/gallery", galleryRoutes_1.default);
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
    app.use((err, req, res, _next) => {
        console.error("=== SERVER ERROR ===");
        console.error("Path:", req.method, req.path);
        console.error("Error:", err);
        console.error("======================");
        const message = err instanceof Error ? err.message : "Internal Server Error";
        const statusCode = err instanceof errorHandler_1.AppError
            ? err.statusCode
            : err instanceof Error && err.message.includes("CORS")
                ? 403
                : 500;
        const origin = req.headers.origin;
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
    });
    return app;
}
