"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.allowedImageMimeTypes = exports.maxImageSizeBytes = exports.r2PublicUrl = exports.r2BucketName = exports.r2Client = void 0;
const path_1 = __importDefault(require("path"));
const client_s3_1 = require("@aws-sdk/client-s3");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config({ path: path_1.default.resolve(process.cwd(), ".env") });
const requiredEnvVars = [
    "R2_ACCOUNT_ID",
    "R2_ACCESS_KEY_ID",
    "R2_SECRET_ACCESS_KEY",
    "R2_BUCKET_NAME",
    "R2_PUBLIC_URL",
];
for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
        console.warn(`[R2] Missing environment variable: ${envVar}`);
    }
}
exports.r2Client = new client_s3_1.S3Client({
    region: "auto",
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
    },
    forcePathStyle: false,
});
exports.r2BucketName = process.env.R2_BUCKET_NAME || "";
exports.r2PublicUrl = process.env.R2_PUBLIC_URL || "";
exports.maxImageSizeBytes = Number(process.env.R2_MAX_IMAGE_SIZE_BYTES || 5 * 1024 * 1024);
exports.allowedImageMimeTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
