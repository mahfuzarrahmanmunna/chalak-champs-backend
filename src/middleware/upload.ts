// src/middleware/upload.ts
/// <reference path="../types/express.d.ts" />
import multer, { FileFilterCallback, MulterError } from "multer";
import type { NextFunction, Request, Response } from "express";
import { allowedImageMimeTypes, maxImageSizeBytes } from "../config/r2";
import { R2Service } from "../services/r2.service";

const storage = multer.memoryStorage();

const fileFilter = (
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

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: maxImageSizeBytes,
    files: 1,
  },
});

export const uploadSingleImage = (fieldName = "image") => upload.single(fieldName);

export const uploadToR2 = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ success: false, message: "No image file provided" });
      return;
    }

    if (!req.file.buffer?.length) {
      res.status(400).json({ success: false, message: "Uploaded image is empty" });
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

    const message = error instanceof Error ? error.message : "Image upload failed";
    res.status(500).json({ success: false, message });
  }
};
