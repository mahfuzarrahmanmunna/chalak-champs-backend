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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const videoGalleryController = __importStar(require("../controllers/videoGalleryController"));
const upload_1 = require("../middleware/upload");
const router = (0, express_1.Router)();
const handleThumbnailUploadError = (error, _req, res, next) => {
    if (res.headersSent) {
        next(error);
        return;
    }
    const message = error instanceof Error ? error.message : "Invalid thumbnail upload";
    const status = error instanceof multer_1.default.MulterError && error.code === "LIMIT_FILE_SIZE"
        ? 413
        : 400;
    res.status(status).json({ success: false, message });
};
router.get("/", videoGalleryController.getVideoGallery);
router.post("/", upload_1.uploadVideoThumbnails, handleThumbnailUploadError, videoGalleryController.upsertVideoGallery);
router.delete("/:youtubeId", videoGalleryController.deleteVideo);
exports.default = router;
