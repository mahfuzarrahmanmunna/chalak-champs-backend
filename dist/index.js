"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/index.ts
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const dotenv_1 = __importDefault(require("dotenv"));
const mongoose_1 = __importDefault(require("mongoose"));
const path_1 = __importDefault(require("path"));
// Import Routes
const auth_1 = __importDefault(require("./routes/auth"));
const courses_1 = __importDefault(require("./routes/courses"));
const admin_1 = __importDefault(require("./routes/admin"));
// 1. IMPORT THE NEW ROUTE HERE
const contactSheet_1 = __importDefault(require("./routes/contactSheet"));
const freeBookingRoutes_1 = __importDefault(require("./routes/freeBookingRoutes"));
// Config
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI;
// --- Database Connection ---
if (!MONGODB_URI) {
    console.error("FATAL ERROR: MONGODB_URI is not defined.");
    process.exit(1);
}
const connectDB = async () => {
    try {
        await mongoose_1.default.connect(MONGODB_URI);
        console.log("✅ MongoDB Connected Successfully");
    }
    catch (error) {
        console.error("❌ MongoDB Connection Error:", error);
        process.exit(1);
    }
};
// Connect to DB before listening
connectDB();
// --- Middleware ---
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
}));
app.use((0, morgan_1.default)("dev"));
app.use(express_1.default.json({ limit: "10mb" })); // This parses JSON bodies
app.use(express_1.default.urlencoded({ extended: true, limit: "10mb" }));
// Static Files
app.use("/uploads", express_1.default.static(path_1.default.join(__dirname, "../uploads")));
// --- Routes ---
app.use("/api/auth", auth_1.default);
app.use("/api/courses", courses_1.default);
app.use("/api/admin", admin_1.default);
// 2. REGISTER THE ROUTE HERE (After middleware!)
app.use("/api/contact", contactSheet_1.default);
app.use("/api/auth", auth_1.default); // <--- The router is mounted at '/api/auth'
app.use("/api/freebooking", freeBookingRoutes_1.default);
app.use("/api/freebookingprops", freeBookingRoutes_1.default);
// Health Check
app.get("/health", (req, res) => {
    res.json({ status: "OK", timestamp: new Date() });
});
// --- Error Handling ---
app.use((req, res) => {
    res.status(404).json({ message: "Route not found" });
});
app.use((err, req, res, next) => {
    console.error("Server Error:", err);
    res.status(500).json({ message: err.message || "Internal Server Error" });
});
// --- Start Server ---
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});
