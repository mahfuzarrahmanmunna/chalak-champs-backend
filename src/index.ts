// src/index.ts
import dotenv from "dotenv";
import { createExpressApp } from "./expressApp"; // or "./app" depending on your file name
import { ensureMongoConnected } from "./db/mongo";

dotenv.config();

const PORT = Number(process.env.PORT) || 5000;

async function bootstrap() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("FATAL ERROR: MONGODB_URI is not defined.");
    process.exit(1);
  }

  try {
    await ensureMongoConnected();
    console.log("✅ MongoDB Connected Successfully");
  } catch (error) {
    console.error("❌ MongoDB Connection Error:", error);
    process.exit(1);
  }

  const app = createExpressApp(); // Ensure this matches the export in src/app.ts

  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
  });
}

bootstrap();
