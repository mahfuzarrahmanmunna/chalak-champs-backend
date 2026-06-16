"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/index.ts
const dotenv_1 = __importDefault(require("dotenv"));
const expressApp_1 = require("./expressApp"); // or "./app" depending on your file name
const mongo_1 = require("./db/mongo");
dotenv_1.default.config();
const PORT = Number(process.env.PORT) || 5000;
async function bootstrap() {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
        console.error("FATAL ERROR: MONGODB_URI is not defined.");
        process.exit(1);
    }
    try {
        await (0, mongo_1.ensureMongoConnected)();
        console.log("✅ MongoDB Connected Successfully");
    }
    catch (error) {
        console.error("❌ MongoDB Connection Error:", error);
        process.exit(1);
    }
    const app = (0, expressApp_1.createExpressApp)(); // Ensure this matches the export in src/app.ts
    app.listen(PORT, () => {
        console.log(`🚀 Server running on port ${PORT}`);
    });
}
bootstrap();
