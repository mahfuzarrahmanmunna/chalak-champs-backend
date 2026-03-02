"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/index.ts
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const dotenv = __importStar(require("dotenv"));
const mongoose_1 = __importDefault(require("mongoose"));
const auth_1 = __importDefault(require("./routes/auth"));
const courses_1 = __importDefault(require("./routes/courses"));
dotenv.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5000;
// Middleware
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)({
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
app.use((0, morgan_1.default)("combined"));
app.use(express_1.default.json({ limit: "10mb" }));
app.use(express_1.default.urlencoded({ extended: true }));
// Routes
app.use("/api/auth", auth_1.default);
app.use("/api/courses", courses_1.default);
// Error handling middleware
app.use((err, req, res, next) => {
    console.error("Unhandled error:", err);
    res.status(500).json({ message: "Something went wrong!" });
});
// 404 handler
app.use((req, res, next) => {
    res.status(404).json({ message: "Route not found" });
});
// Connect to MongoDB and start server
const startServer = async () => {
    const allowStartWithoutDb = process.env.ALLOW_START_WITHOUT_DB === "true";
    const mongoURI = process.env.MONGODB_URI;
    if (!mongoURI) {
        console.error("MongoDB URI is not defined in .env");
        if (!allowStartWithoutDb)
            process.exit(1);
    }
    else {
        try {
            mongoose_1.default.set("strictQuery", false);
            await mongoose_1.default.connect(mongoURI);
            console.log("MongoDB connected successfully");
        }
        catch (error) {
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
