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
exports.mongoose = exports.disconnectDB = exports.connectDB = void 0;
// src/config/database.ts
const path_1 = __importDefault(require("path"));
const mongoose_1 = __importDefault(require("mongoose")); // ✅ Explicit import
exports.mongoose = mongoose_1.default;
const dotenv = __importStar(require("dotenv"));
dotenv.config({ path: path_1.default.resolve(process.cwd(), ".env") });
const MONGODB_OPTIONS = {
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    maxPoolSize: 10,
    retryWrites: true,
    w: "majority",
};
const connectDB = async () => {
    try {
        const mongoURI = process.env.MONGODB_URI;
        if (!mongoURI) {
            throw new Error("MongoDB URI is not defined in environment variables");
        }
        // Set mongoose options
        mongoose_1.default.set("strictQuery", false);
        mongoose_1.default.connection.setMaxListeners(20);
        await mongoose_1.default.connect(mongoURI, MONGODB_OPTIONS);
        console.log("✅ MongoDB connected successfully");
        // Handle connection events
        mongoose_1.default.connection.on("connected", () => {
            console.log("Mongoose connected to DB");
        });
        mongoose_1.default.connection.on("error", (err) => {
            console.error("Mongoose connection error:", err);
        });
        mongoose_1.default.connection.on("disconnected", () => {
            console.log("Mongoose disconnected");
        });
    }
    catch (error) {
        console.error("❌ MongoDB connection error:", error);
        process.exit(1);
    }
};
exports.connectDB = connectDB;
const disconnectDB = async () => {
    try {
        await mongoose_1.default.disconnect();
        console.log("MongoDB disconnected successfully");
    }
    catch (error) {
        console.error("MongoDB disconnection error:", error);
    }
};
exports.disconnectDB = disconnectDB;
