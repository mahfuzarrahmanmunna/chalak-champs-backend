// src/middleware/upload.ts
/// <reference path="../types/express.d.ts" />
import multer, { FileFilterCallback, MulterError } from "multer";
import type { NextFunction, Request, Response } from "express";
import { allowedImageMimeTypes, maxImageSizeBytes } from "../config/r2";
import { R2Service } from "../services/r2.service";

const storage = multer.memoryStorage();

// For single image upload (existing)
const imageFileFilter = (
  req: Request,
  file: Express.Multer.File,
  cb: FileFilterCallback,
) => {
  if (!file?.mimetype) {
    cb(new Error("Invalid image upload"));
    return;
  }

  if (!allowedImageMimeTypes.includes(file.mimetype)) {
    cb(
      new Error(
        "Unsupported image type. Allowed types: jpg, jpeg, png, webp, gif",
      ),
    );
    return;
  }

  cb(null, true);
};

const uploadSingle = multer({
  storage,
  fileFilter: imageFileFilter,
  limits: {
    fileSize: maxImageSizeBytes,
    files: 1,
  },
});

export const uploadSingleImage = (fieldName = "image") =>
  uploadSingle.single(fieldName);

export const uploadToR2 = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.file) {
      res
        .status(400)
        .json({ success: false, message: "No image file provided" });
      return;
    }

    if (!req.file.buffer?.length) {
      res
        .status(400)
        .json({ success: false, message: "Uploaded image is empty" });
      return;
    }

    const folder = (req.body?.folder as string) || "profile";
    const uploadResult = await R2Service.uploadImage(
      req.file.buffer,
      req.file.mimetype,
      folder,
    );

    req.imageUrl = uploadResult.url;
    req.imageKey = uploadResult.key;
    next();
  } catch (error) {
    if (error instanceof MulterError) {
      if (error.code === "LIMIT_FILE_SIZE") {
        res.status(400).json({ success: false, message: "Image too large" });
        return;
      }

      res.status(400).json({ success: false, message: error.message });
      return;
    }

    const message =
      error instanceof Error ? error.message : "Image upload failed";
    res.status(500).json({ success: false, message });
  }
};

// ============================================
// COURSE UPLOAD MIDDLEWARE (NEW)
// ============================================

const courseFileFilter = (
  req: Request,
  file: Express.Multer.File,
  cb: FileFilterCallback,
) => {
  if (!file?.mimetype) {
    cb(new Error("Invalid file upload"));
    return;
  }

  const allowedTypes = [
    // Images
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
    // Videos
    "video/mp4",
    "video/webm",
    "video/quicktime",
  ];

  if (!allowedTypes.includes(file.mimetype)) {
    cb(
      new Error(
        "Unsupported file type. Allowed: jpg, png, webp, gif, mp4, webm",
      ),
    );
    return;
  }

  cb(null, true);
};

const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100MB for videos
const MAX_IMAGE_SIZE = maxImageSizeBytes; // 5MB from config

const getLimitForField = (fieldname: string) => {
  if (fieldname === "video" || fieldname === "mediaFiles") {
    return MAX_VIDEO_SIZE;
  }
  return MAX_IMAGE_SIZE;
};

const uploadCourse = multer({
  storage,
  fileFilter: courseFileFilter,
  limits: {
    fileSize: MAX_VIDEO_SIZE, // Use max video size as global limit
    files: 15, // thumbnail + video + instructor image + up to 12 media files
  },
});

// For course creation/update with multiple file fields
export const uploadCourseMedia = uploadCourse.fields([
  { name: "thumbnail", maxCount: 1 },
  { name: "video", maxCount: 1 },
  { name: "instructorImage", maxCount: 1 },
  { name: "mediaFiles", maxCount: 10 },
]);

// Just thumbnail
export const uploadCourseThumbnail = uploadCourse.single("thumbnail");

// Helper type for course files
export interface CourseMulterFiles {
  thumbnail?: Express.Multer.File[];
  video?: Express.Multer.File[];
  instructorImage?: Express.Multer.File[];
  mediaFiles?: Express.Multer.File[];
}

// Helper to get files from request
export function getCourseFiles(req: Request): CourseMulterFiles {
  const files = req.files as Record<string, Express.Multer.File[]> | undefined;
  if (!files) return {};

  return {
    thumbnail: files.thumbnail,
    video: files.video,
    instructorImage: files.instructorImage,
    mediaFiles: files.mediaFiles,
  };
}

export const uploadVideoThumbnails = multer({
  storage,
  fileFilter: imageFileFilter, // Reuses your existing strict image filter
  limits: {
    fileSize: maxImageSizeBytes, // Reuses your 5MB limit from config
    files: 20, // Allow up to 20 thumbnails at once
  },
}).array("thumbnails"); // Expects frontend to use fd.append("thumbnails", file)

const moduleFileFilter = (
  req: Request,
  file: Express.Multer.File,
  cb: FileFilterCallback,
) => {
  if (!file?.mimetype) {
    cb(new Error("Invalid file upload"));
    return;
  }

  const allowedImageTypes = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
  ];
  const allowedVideoTypes = ["video/mp4", "video/webm", "video/quicktime"];
  const allowed = [...allowedImageTypes, ...allowedVideoTypes];

  if (!allowed.includes(file.mimetype)) {
    cb(
      new Error(
        "Unsupported file type. Allowed: jpg, png, webp, gif, mp4, webm",
      ),
    );
    return;
  }

  cb(null, true);
};

const uploadModule = multer({
  storage, // memoryStorage from top of file
  fileFilter: moduleFileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB to support video uploads
    files: 2, // thumbnail + video
  },
});

export const uploadModuleMedia = uploadModule.fields([
  { name: "thumbnail", maxCount: 1 },
  { name: "video", maxCount: 1 },
]);

export interface ModuleMulterFiles {
  thumbnail?: Express.Multer.File[];
  video?: Express.Multer.File[];
}

export function getModuleFiles(req: Request): ModuleMulterFiles {
  const files = req.files as Record<string, Express.Multer.File[]> | undefined;
  if (!files) return {};
  return {
    thumbnail: files.thumbnail,
    video: files.video,
  };
}