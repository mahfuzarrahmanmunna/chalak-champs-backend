import mongoose from "mongoose";

/** Idempotent Mongo connect suitable for Workers (may run many cold starts per isolate). */
export async function ensureMongoConnected(): Promise<void> {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI is not configured");
  }
  if (mongoose.connection.readyState === 1 || mongoose.connection.readyState === 2) {
    return;
  }
  await mongoose.connect(uri);
}
