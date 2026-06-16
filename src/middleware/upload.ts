// src/middleware/upload.ts
import multer, { FileFilterCallback } from "multer";
import path from "path";
import { Request } from "express";
import { AppError } from "./errorHandler";

type StorageFile = { fieldname: string; originalname: string };
type StorageCb = (err: Error | null, path: string) => void;

// Use memory storage to avoid writing files to disk (better for serverless)
const storage = multer.memoryStorage();

// File filter
const fileFilter = (
  req: Request,
  file: { fieldname: string; mimetype: string },
  cb: FileFilterCallback,
) => {
  if (file.fieldname === "thumbnail") {
    // Accept only image files for thumbnail
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new AppError("Only image files are allowed for thumbnail", 400));
    }
  } else if (file.fieldname === "video") {
    // Accept only video files for video
    if (file.mimetype.startsWith("video/")) {
      cb(null, true);
    } else {
      cb(new AppError("Only video files are allowed", 400));
    }
  } else {
    cb(new AppError("Unexpected field", 400));
  }
};

// Configure multer
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit
  },
});

// Export upload middleware for course files
export const uploadCourseFiles = upload.fields([
  { name: "thumbnail", maxCount: 1 },
  { name: "video", maxCount: 1 },
]);

// Export single file upload for other uses
export const uploadSingle = (fieldName: string) => upload.single(fieldName);
