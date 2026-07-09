"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensureMongoConnected = ensureMongoConnected;
const mongoose_1 = __importDefault(require("mongoose"));
/** Idempotent Mongo connect suitable for Workers (may run many cold starts per isolate). */
async function ensureMongoConnected() {
    const uri = process.env.MONGODB_URI;
    const allowStartWithoutDB = process.env.ALLOW_START_WITHOUT_DB === "true";
    if (!uri) {
        if (allowStartWithoutDB) {
            console.warn("⚠️ MongoDB URI is not configured. Continuing because ALLOW_START_WITHOUT_DB=true.");
            return;
        }
        throw new Error("MONGODB_URI is not configured");
    }
    if (mongoose_1.default.connection.readyState === 1 || mongoose_1.default.connection.readyState === 2) {
        return;
    }
    try {
        await mongoose_1.default.connect(uri);
    }
    catch (error) {
        if (allowStartWithoutDB) {
            console.warn("⚠️ MongoDB connection failed. Continuing because ALLOW_START_WITHOUT_DB=true.", error);
            return;
        }
        throw error;
    }
}
