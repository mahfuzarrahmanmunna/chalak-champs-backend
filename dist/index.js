"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/index.ts
const path_1 = __importDefault(require("path"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config({ path: path_1.default.resolve(process.cwd(), ".env") });
const envPath = path_1.default.resolve(process.cwd(), ".env");
console.log(`Loading environment from: ${envPath}`);
console.log("Env presence:", {
    MONGODB_URI: Boolean(process.env.MONGODB_URI),
    EMAIL_USER: Boolean(process.env.EMAIL_USER),
    EMAIL_PASS: Boolean(process.env.EMAIL_PASS),
    FIREBASE_PROJECT_ID: Boolean(process.env.FIREBASE_PROJECT_ID),
    FIREBASE_PRIVATE_KEY: Boolean(process.env.FIREBASE_PRIVATE_KEY),
    FIREBASE_CLIENT_EMAIL: Boolean(process.env.FIREBASE_CLIENT_EMAIL),
    GOOGLE_APPLICATION_CREDENTIALS: Boolean(process.env.GOOGLE_APPLICATION_CREDENTIALS),
});
const mongoose_1 = __importDefault(require("mongoose"));
const expressApp_1 = require("./expressApp"); // or "./app" depending on your file name
const mongo_1 = require("./db/mongo");
const PORT = Number(process.env.PORT) || 5000;
const allowStartWithoutDB = process.env.ALLOW_START_WITHOUT_DB === "true";
async function bootstrap() {
    const uri = process.env.MONGODB_URI;
    if (!uri && !allowStartWithoutDB) {
        console.error("FATAL ERROR: MONGODB_URI is not defined.");
        process.exit(1);
    }
    try {
        await (0, mongo_1.ensureMongoConnected)();
        if (mongoose_1.default.connection.readyState === 1) {
            console.log("✅ MongoDB Connected Successfully");
        }
        else if (allowStartWithoutDB) {
            console.warn("⚠️ MongoDB is not connected. Running without database access because ALLOW_START_WITHOUT_DB=true.");
        }
    }
    catch (error) {
        if (allowStartWithoutDB) {
            console.warn("⚠️ MongoDB Connection Error:", error, "Continuing because ALLOW_START_WITHOUT_DB=true.");
        }
        else {
            console.error("❌ MongoDB Connection Error:", error);
            process.exit(1);
        }
    }
    const app = (0, expressApp_1.createExpressApp)(); // Ensure this matches the export in src/app.ts
    app.listen(PORT, () => {
        console.log(`🚀 Server running on port ${PORT}`);
    });
}
bootstrap();
