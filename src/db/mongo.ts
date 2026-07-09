import mongoose from "mongoose";

/** Idempotent Mongo connect suitable for Workers (may run many cold starts per isolate). */
export async function ensureMongoConnected(): Promise<void> {
  const uri = process.env.MONGODB_URI;
  const allowStartWithoutDB = process.env.ALLOW_START_WITHOUT_DB === "true";

  if (!uri) {
    if (allowStartWithoutDB) {
      console.warn(
        "⚠️ MongoDB URI is not configured. Continuing because ALLOW_START_WITHOUT_DB=true.",
      );
      return;
    }
    throw new Error("MONGODB_URI is not configured");
  }

  if (mongoose.connection.readyState === 1 || mongoose.connection.readyState === 2) {
    return;
  }

  try {
    await mongoose.connect(uri);
  } catch (error) {
    if (allowStartWithoutDB) {
      console.warn(
        "⚠️ MongoDB connection failed. Continuing because ALLOW_START_WITHOUT_DB=true.",
        error,
      );
      return;
    }
    throw error;
  }
}
