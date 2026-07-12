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
exports.uploadToR2 = exports.uploadSingleImage = void 0;
// src/middleware/upload.ts
/// <reference path="../types/express.d.ts" />
const multer_1 = __importStar(require("multer"));
const r2_1 = require("../config/r2");
const r2_service_1 = require("../services/r2.service");
const storage = multer_1.default.memoryStorage();
const fileFilter = (req, file, cb) => {
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
const upload = (0, multer_1.default)({
    storage,
    fileFilter,
    limits: {
        fileSize: r2_1.maxImageSizeBytes,
        files: 1,
    },
});
const uploadSingleImage = (fieldName = "image") => upload.single(fieldName);
exports.uploadSingleImage = uploadSingleImage;
const uploadToR2 = async (req, res, next) => {
    try {
        if (!req.file) {
            res.status(400).json({ success: false, message: "No image file provided" });
            return;
        }
        if (!req.file.buffer?.length) {
            res.status(400).json({ success: false, message: "Uploaded image is empty" });
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
exports.uploadToR2 = uploadToR2;
