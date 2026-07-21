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
/**
 * Builds the Express app (middleware + routes) without calling listen().
 */
function createExpressApp() {
    const app = (0, express_1.default)();
    // ==========================================
    // 1. SECURITY & PARSING (Must be first)
    // ==========================================
    app.use((0, helmet_1.default)());
    app.use((0, morgan_1.default)("dev"));
    app.use(express_1.default.json({ limit: "10mb" }));
    app.use(express_1.default.urlencoded({ extended: true, limit: "10mb" }));
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
    ].filter((origin) => Boolean(origin));
    const isDevelopment = process.env.NODE_ENV !== "production";
    const allowLocalhost = process.env.ALLOW_LOCALHOST_ORIGINS === "true" || isDevelopment;
    if (allowLocalhost) {
        allowedOrigins.push(...localOrigins);
    }
    app.use((req, res, next) => {
        const origin = req.headers.origin;
        if (allowLocalhost || !origin) {
            res.setHeader("Access-Control-Allow-Origin", origin || "*");
        }
        else if (origin && allowedOrigins.includes(origin)) {
            res.setHeader("Access-Control-Allow-Origin", origin);
        }
        res.setHeader("Access-Control-Allow-Credentials", "true");
        res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
        res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
        if (req.method === "OPTIONS") {
            return res.sendStatus(200);
        }
        next();
    });
    app.use((0, cors_1.default)({
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
    // 4. DATABASE CONNECTION (Moved here, AFTER CORS)
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
    // 5. ROUTES
    // ==========================================
    app.use("/api/auth", auth_1.default);
    app.use("/auth", auth_1.default);
    app.use("/api/courses", courses_1.default);
    app.use("/api/admin", admin_1.default);
    app.use("/api/contact", contactSheet_1.default);
    app.use("/api/freebooking", freeBookingRoutes_1.default);
    app.use("/api/freebookingprops", freeBookingRoutes_1.default);
    app.use("/api/exam", examRoutes_1.default);
    app.use("/api/enrollments", enrollmentRoutes_1.default);
    app.use("/api/cta", ctaRoutes_1.default);
    app.use("/api/products", products_1.default);
    app.use("/api/orders", orderRoutes_1.default);
    app.use("/api/promo", promoRoutes_1.default);
    app.use("/api/hero", heroRoutes_1.default);
    app.use("/api/feature-courses-banner", featureCoursesBannerRoutes_1.default);
    app.use("/api/video-gallery", videoGalleryRoute_1.default);
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
    app.use((err, _req, res, _next) => {
        console.error("Server Error:", err);
        const message = err instanceof Error ? err.message : "Internal Server Error";
        // Add CORS headers to errors so the frontend can actually read the error message
        const origin = _req.headers.origin;
        if (allowLocalhost || !origin || allowedOrigins.includes(origin || "")) {
            res.setHeader("Access-Control-Allow-Origin", origin || "*");
        }
        res.status(500).json({ message });
    });
    return app;
}
