import mongoose from "mongoose";

let mongoConnectionPromise: Promise<void> | null = null;
let mongoConnectFailed = false;

function normalizeMongoUri(uri: string): string {
  const trimmed = uri.trim();

  if (trimmed.startsWith("+")) {
    const withoutLeadingPlus = trimmed.slice(1);
    if (withoutLeadingPlus.startsWith("srv://")) {
      return `mongodb+${withoutLeadingPlus}`;
    }
    if (
      withoutLeadingPlus.startsWith("mongodb://") ||
      withoutLeadingPlus.startsWith("mongodb+srv://")
    ) {
      return withoutLeadingPlus;
    }
  }

  return trimmed;
}

/** Idempotent Mongo connect suitable for Workers (may run many cold starts per isolate). */
export async function ensureMongoConnected(): Promise<void> {
  const rawUri = process.env.MONGODB_URI;
  const allowStartWithoutDB = process.env.ALLOW_START_WITHOUT_DB === "true";

  if (!rawUri) {
    if (allowStartWithoutDB) {
      console.warn(
        "⚠️ MongoDB URI is not configured. Continuing because ALLOW_START_WITHOUT_DB=true.",
      );
      return;
    }
    throw new Error("MONGODB_URI is not configured");
  }

  const uri = normalizeMongoUri(rawUri);
  if (uri !== rawUri) {
    process.env.MONGODB_URI = uri;
  }

  if (mongoConnectFailed) {
    return;
  }

  if (mongoose.connection.readyState === 1) {
    return;
  }

  if (mongoose.connection.readyState === 2 && mongoConnectionPromise) {
    await mongoConnectionPromise;
    return;
  }

  mongoConnectionPromise = (async () => {
    try {
      await mongoose.connect(uri);
    } catch (error) {
      mongoConnectFailed = true;
      throw error;
    }
  })();

  try {
    await mongoConnectionPromise;
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
