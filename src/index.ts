// src/index.ts
import path from "path";
import dotenv from "dotenv";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const envPath = path.resolve(process.cwd(), ".env");
console.log(`Loading environment from: ${envPath}`);
console.log(
  "Env presence:",
  {
    MONGODB_URI: Boolean(process.env.MONGODB_URI),
    EMAIL_USER: Boolean(process.env.EMAIL_USER),
    EMAIL_PASS: Boolean(process.env.EMAIL_PASS),
    FIREBASE_PROJECT_ID: Boolean(process.env.FIREBASE_PROJECT_ID),
    FIREBASE_PRIVATE_KEY: Boolean(process.env.FIREBASE_PRIVATE_KEY),
    FIREBASE_CLIENT_EMAIL: Boolean(process.env.FIREBASE_CLIENT_EMAIL),
    GOOGLE_APPLICATION_CREDENTIALS: Boolean(process.env.GOOGLE_APPLICATION_CREDENTIALS),
  },
);

import mongoose from "mongoose";
import { createExpressApp } from "./expressApp"; // or "./app" depending on your file name
import { ensureMongoConnected } from "./db/mongo";

const PORT = Number(process.env.PORT) || 5000;
const allowStartWithoutDB = process.env.ALLOW_START_WITHOUT_DB === "true";

async function bootstrap() {
  const uri = process.env.MONGODB_URI;
  if (!uri && !allowStartWithoutDB) {
    console.error("FATAL ERROR: MONGODB_URI is not defined.");
    process.exit(1);
  }

  try {
    await ensureMongoConnected();
    if (mongoose.connection.readyState === 1) {
      console.log("✅ MongoDB Connected Successfully");
    } else if (allowStartWithoutDB) {
      console.warn(
        "⚠️ MongoDB is not connected. Running without database access because ALLOW_START_WITHOUT_DB=true.",
      );
    }
  } catch (error) {
    if (allowStartWithoutDB) {
      console.warn(
        "⚠️ MongoDB Connection Error:",
        error,
        "Continuing because ALLOW_START_WITHOUT_DB=true.",
      );
    } else {
      console.error("❌ MongoDB Connection Error:", error);
      process.exit(1);
    }
  }

  const app = createExpressApp(); // Ensure this matches the export in src/app.ts

  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
  });
}

bootstrap();
