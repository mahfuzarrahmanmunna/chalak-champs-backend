"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadSingle = exports.uploadCourseFiles = void 0;
// src/middleware/upload.ts
const multer_1 = __importDefault(require("multer"));
const errorHandler_1 = require("./errorHandler");
// Use memory storage to avoid writing files to disk (better for serverless)
const storage = multer_1.default.memoryStorage();
// File filter
const fileFilter = (req, file, cb) => {
    if (file.fieldname === "thumbnail") {
        // Accept only image files for thumbnail
        if (file.mimetype.startsWith("image/")) {
            cb(null, true);
        }
        else {
            cb(new errorHandler_1.AppError("Only image files are allowed for thumbnail", 400));
        }
    }
    else if (file.fieldname === "video") {
        // Accept only video files for video
        if (file.mimetype.startsWith("video/")) {
            cb(null, true);
        }
        else {
            cb(new errorHandler_1.AppError("Only video files are allowed", 400));
        }
    }
    else {
        cb(new errorHandler_1.AppError("Unexpected field", 400));
    }
};
// Configure multer
const upload = (0, multer_1.default)({
    storage,
    fileFilter,
    limits: {
        fileSize: 100 * 1024 * 1024, // 100MB limit
    },
});
// Export upload middleware for course files
exports.uploadCourseFiles = upload.fields([
    { name: "thumbnail", maxCount: 1 },
    { name: "video", maxCount: 1 },
]);
// Export single file upload for other uses
const uploadSingle = (fieldName) => upload.single(fieldName);
exports.uploadSingle = uploadSingle;
