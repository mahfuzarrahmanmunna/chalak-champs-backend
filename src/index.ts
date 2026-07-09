// src/index.ts
import dotenv from "dotenv";
import mongoose from "mongoose";
import { createExpressApp } from "./expressApp"; // or "./app" depending on your file name
import { ensureMongoConnected } from "./db/mongo";

dotenv.config();

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
