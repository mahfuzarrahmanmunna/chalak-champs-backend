"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadCourseThumbnail = exports.uploadCourseMedia = exports.uploadToR2 = exports.uploadSingleImage = void 0;
exports.getCourseFiles = getCourseFiles;
// src/middleware/upload.ts
/// <reference path="../types/express.d.ts" />
const multer_1 = __importStar(require("multer"));
const r2_1 = require("../config/r2");
const r2_service_1 = require("../services/r2.service");
const storage = multer_1.default.memoryStorage();
// For single image upload (existing)
const imageFileFilter = (req, file, cb) => {
    if (!file?.mimetype) {
        cb(new Error("Invalid image upload"));
        return;
    }
    if (!r2_1.allowedImageMimeTypes.includes(file.mimetype)) {
        cb(new Error("Unsupported image type. Allowed types: jpg, jpeg, png, webp, gif"));
        return;
    }
    cb(null, true);
};
const uploadSingle = (0, multer_1.default)({
    storage,
    fileFilter: imageFileFilter,
    limits: {
        fileSize: r2_1.maxImageSizeBytes,
        files: 1,
    },
});
const uploadSingleImage = (fieldName = "image") => uploadSingle.single(fieldName);
exports.uploadSingleImage = uploadSingleImage;
const uploadToR2 = async (req, res, next) => {
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
        const folder = req.body?.folder || "profile";
        const uploadResult = await r2_service_1.R2Service.uploadImage(req.file.buffer, req.file.mimetype, folder);
        req.imageUrl = uploadResult.url;
        req.imageKey = uploadResult.key;
        next();
    }
    catch (error) {
        if (error instanceof multer_1.MulterError) {
            if (error.code === "LIMIT_FILE_SIZE") {
                res
                    .status(400)
                    .json({ success: false, message: "Image too large" });
                return;
            }
            res.status(400).json({ success: false, message: error.message });
            return;
        }
        const message = error instanceof Error ? error.message : "Image upload failed";
        res.status(500).json({ success: false, message });
    }
};
exports.uploadToR2 = uploadToR2;
// ============================================
// COURSE UPLOAD MIDDLEWARE (NEW)
// ============================================
const courseFileFilter = (req, file, cb) => {
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
        cb(new Error("Unsupported file type. Allowed: jpg, png, webp, gif, mp4, webm"));
        return;
    }
    cb(null, true);
};
const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100MB for videos
const MAX_IMAGE_SIZE = r2_1.maxImageSizeBytes; // 5MB from config
const getLimitForField = (fieldname) => {
    if (fieldname === "video" || fieldname === "mediaFiles") {
        return MAX_VIDEO_SIZE;
    }
    return MAX_IMAGE_SIZE;
};
const uploadCourse = (0, multer_1.default)({
    storage,
    fileFilter: courseFileFilter,
    limits: {
        fileSize: MAX_VIDEO_SIZE, // Use max video size as global limit
        files: 15, // thumbnail + video + instructor image + up to 12 media files
    },
});
// For course creation/update with multiple file fields
exports.uploadCourseMedia = uploadCourse.fields([
    { name: "thumbnail", maxCount: 1 },
    { name: "video", maxCount: 1 },
    { name: "instructorImage", maxCount: 1 },
    { name: "mediaFiles", maxCount: 10 },
]);
// Just thumbnail
exports.uploadCourseThumbnail = uploadCourse.single("thumbnail");
// Helper to get files from request
function getCourseFiles(req) {
    const files = req.files;
    if (!files)
        return {};
    return {
        thumbnail: files.thumbnail,
        video: files.video,
        instructorImage: files.instructorImage,
        mediaFiles: files.mediaFiles,
    };
}
