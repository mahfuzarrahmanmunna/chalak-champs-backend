"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensureMongoConnected = ensureMongoConnected;
exports.resetMongoConnection = resetMongoConnection;
exports.getMongoStatus = getMongoStatus;
const mongoose_1 = __importDefault(require("mongoose"));
let mongoConnectionPromise = null;
let mongoConnectFailed = false;
let lastFailureTime = 0;
const RETRY_COOLDOWN_MS = 30000;
const CONNECTION_OPTIONS = {
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    maxPoolSize: 10,
    retryWrites: true,
    w: "majority",
};
function normalizeMongoUri(uri) {
    const trimmed = uri.trim();
    if (trimmed.startsWith("+")) {
        const withoutLeadingPlus = trimmed.slice(1);
        if (withoutLeadingPlus.startsWith("srv://")) {
            return `mongodb+${withoutLeadingPlus}`;
        }
        if (withoutLeadingPlus.startsWith("mongodb://") ||
            withoutLeadingPlus.startsWith("mongodb+srv://")) {
            return withoutLeadingPlus;
        }
    }
    return trimmed;
}
function isRetryableError(error) {
    if (!(error instanceof Error))
        return false;
    const message = error.message.toLowerCase();
    // These errors should NOT be retried (credentials, config issues)
    const nonRetryable = [
        "bad auth", // Wrong credentials - Code 8000
        "authentication failed",
        "unauthorized",
        "invalid username",
    ];
    if (nonRetryable.some(msg => message.includes(msg))) {
        return false;
    }
    // These errors CAN be retried (network, timeout)
    const retryable = [
        "timeout",
        "connection refused",
        "network",
        "econnreset",
        "enotfound",
        "server selection timeout",
    ];
    return retryable.some(msg => message.includes(msg));
}
function logErrorDetails(error) {
    if (error && typeof error === "object" && "code" in error) {
        const mongoError = error;
        switch (mongoError.code) {
            case 8000:
                console.error("❌ Authentication Error (Code 8000): Check MONGODB_URI credentials");
                console.error("   → Go to Atlas → Database Access → Verify username/password");
                break;
            case 13:
                console.error("❌ Permission Error (Code 13): User lacks permissions for this database");
                break;
            default:
                console.error(`❌ MongoDB Error (Code ${mongoError.code}): ${mongoError.codeName}`);
        }
    }
}
/** Idempotent Mongo connect suitable for Workers (may run many cold starts per isolate). */
async function ensureMongoConnected() {
    const rawUri = process.env.MONGODB_URI;
    const allowStartWithoutDB = process.env.ALLOW_START_WITHOUT_DB === "true";
    if (!rawUri) {
        if (allowStartWithoutDB) {
            console.warn("⚠️ MongoDB URI is not configured. Continuing because ALLOW_START_WITHOUT_DB=true.");
            return;
        }
        throw new Error("MONGODB_URI is not configured");
    }
    const uri = normalizeMongoUri(rawUri);
    if (uri !== rawUri) {
        process.env.MONGODB_URI = uri;
    }
    // ✅ Allow retry after cooldown period
    if (mongoConnectFailed) {
        const timeSinceFailure = Date.now() - lastFailureTime;
        if (timeSinceFailure < RETRY_COOLDOWN_MS) {
            return;
        }
        console.log("🔄 Retrying MongoDB connection...");
        mongoConnectFailed = false;
        mongoConnectionPromise = null;
    }
    // Already connected
    if (mongoose_1.default.connection.readyState === 1) {
        return;
    }
    // Connection in progress - wait for it
    if (mongoose_1.default.connection.readyState === 2 && mongoConnectionPromise) {
        await mongoConnectionPromise;
        return;
    }
    // Start new connection
    mongoConnectionPromise = (async () => {
        try {
            await mongoose_1.default.connect(uri, CONNECTION_OPTIONS);
            console.log("✅ MongoDB connected successfully");
        }
        catch (error) {
            lastFailureTime = Date.now();
            // ✅ Only set permanent failure for non-retryable errors
            if (!isRetryableError(error)) {
                mongoConnectFailed = true;
                logErrorDetails(error);
            }
            throw error;
        }
    })();
    try {
        await mongoConnectionPromise;
    }
    catch (error) {
        if (allowStartWithoutDB) {
            console.warn("⚠️ MongoDB connection failed. Continuing because ALLOW_START_WITHOUT_DB=true.");
            if (!isRetryableError(error)) {
                logErrorDetails(error);
            }
            return;
        }
        throw error;
    }
}
/** Reset connection state (useful for testing or manual retry) */
function resetMongoConnection() {
    if (mongoose_1.default.connection.readyState !== 0) {
        mongoose_1.default.disconnect();
    }
    mongoConnectFailed = false;
    mongoConnectionPromise = null;
    lastFailureTime = 0;
}
/** Get current connection status */
function getMongoStatus() {
    const states = ["disconnected", "connected", "connecting", "disconnecting"];
    const state = states[mongoose_1.default.connection.readyState] || "unknown";
    if (mongoConnectFailed)
        return `failed (was ${state})`;
    return state;
}
