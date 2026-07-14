// src/config/r2.ts
import path from "path";
import { S3Client } from "@aws-sdk/client-s3";
import dotenv from "dotenv";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const requiredEnvVars = [
  "R2_ACCOUNT_ID",
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
  "R2_BUCKET_NAME",
  "R2_PUBLIC_URL",
] as const;

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.warn(`[R2] Missing environment variable: ${envVar}`);
  }
}

export const r2Client = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
  },
  forcePathStyle: false,
});

export const r2BucketName = process.env.R2_BUCKET_NAME || "";
export const r2PublicUrl = process.env.R2_PUBLIC_URL || "";
export const maxImageSizeBytes = Number(
  process.env.R2_MAX_IMAGE_SIZE_BYTES || 5 * 1024 * 1024,
);
export const maxVideoSizeBytes = Number(
  process.env.R2_MAX_VIDEO_SIZE_BYTES || 100 * 1024 * 1024,
);
export const allowedImageMimeTypes = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
];
export const allowedVideoMimeTypes = [
  "video/mp4",
  "video/webm",
  "video/quicktime",
];
export const allowedCourseMimeTypes = [
  ...allowedImageMimeTypes,
  ...allowedVideoMimeTypes,
];