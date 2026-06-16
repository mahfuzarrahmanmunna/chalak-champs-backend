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
    if (!uri) {
        throw new Error("MONGODB_URI is not configured");
    }
    if (mongoose_1.default.connection.readyState === 1 || mongoose_1.default.connection.readyState === 2) {
        return;
    }
    await mongoose_1.default.connect(uri);
}
