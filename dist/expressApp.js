"use strict";
// src/express.App.ts
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
/**
 * Builds the Express app (middleware + routes) without calling listen().
 * Mongo is ensured on each request — readyState checks are cheap once connected.
 */
function createExpressApp() {
    const app = (0, express_1.default)();
    app.use("/api", async (req, _res, next) => {
        try {
            await (0, mongo_1.ensureMongoConnected)();
            next();
        }
        catch (e) {
            next(e);
        }
    });
    app.use((0, helmet_1.default)());
    const localOrigins = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://localhost:3000",
        "https://127.0.0.1:3000",
    ];
    const allowedOrigins = [process.env.FRONTEND_URL || "https://chalakchamps.com"]
        .filter((origin) => Boolean(origin));
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
    app.use((0, morgan_1.default)("dev"));
    app.use(express_1.default.json({ limit: "10mb" }));
    app.use(express_1.default.urlencoded({ extended: true, limit: "10mb" }));
    // Use cwd so this works after bundling for Cloudflare Workers (no __dirname in ESM bundles).
    app.use("/uploads", express_1.default.static(path_1.default.join(process.cwd(), "uploads")));
    app.use("/api/auth", auth_1.default);
    app.use("/auth", auth_1.default);
    app.use("/api/courses", courses_1.default);
    app.use("/api/admin", admin_1.default);
    app.use("/api/contact", contactSheet_1.default);
    app.use("/api/freebooking", freeBookingRoutes_1.default);
    app.use("/api/freebookingprops", freeBookingRoutes_1.default);
    app.use("/api/exam", examRoutes_1.default);
    app.use("/api/enrollments", enrollmentRoutes_1.default);
    app.get("/health", (req, res) => {
        res.json({ status: "OK", timestamp: new Date() });
    });
    app.use((req, res) => {
        res.status(404).json({ message: "Route not found" });
    });
    app.use((err, _req, res, _next) => {
        console.error("Server Error:", err);
        const message = err instanceof Error ? err.message : "Internal Server Error";
        res.status(500).json({ message });
    });
    return app;
}
