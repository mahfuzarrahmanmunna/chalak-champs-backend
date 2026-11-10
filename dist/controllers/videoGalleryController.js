"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteVideo = exports.upsertVideoGallery = exports.getVideoGallery = void 0;
const VideoGallery_1 = __importDefault(require("../models/VideoGallery"));
const r2_service_1 = require("../services/r2.service");
class ThumbnailUploadError extends Error {
}
// --- HELPERS ---
const uploadToR2 = async (file, folder) => {
    if (!file.buffer?.length) {
        throw new Error(`Empty file buffer for ${file.originalname}`);
    }
    const subFolder = "images";
    const result = await r2_service_1.R2Service.uploadFile(file.buffer, file.mimetype, `${folder}/${subFolder}`);
    return result.url;
};
const deleteFromR2 = async (url) => {
    if (!url)
        return;
    try {
        const key = r2_service_1.R2Service.extractKeyFromUrl(url);
        if (key) {
            await r2_service_1.R2Service.deleteFile(key);
        }
    }
    catch (err) {
        console.error("Failed to delete from R2:", err);
    }
};
// --- CONTROLLERS ---
const getVideoGallery = async (req, res) => {
    try {
        let gallery = await VideoGallery_1.default.findOne();
        if (!gallery) {
            gallery = await VideoGallery_1.default.create({
                title: "কেন আমরাই শিক্ষার্থী ও অভিভাবকদের প্রথম পছন্দ",
                subtitle: "Default Subtitle",
                videos: [],
            });
        }
        const activeVideos = gallery.videos
            .filter((v) => v.isActive)
            .sort((a, b) => a.order - b.order);
        res.status(200).json({
            success: true,
            data: {
                title: gallery.title,
                subtitle: gallery.subtitle,
                videos: activeVideos,
            },
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: "Server Error" });
    }
};
exports.getVideoGallery = getVideoGallery;
const upsertVideoGallery = async (req, res) => {
    try {
        // 1. Parse incoming payload
        const parsedData = JSON.parse(req.body.data);
        const { title, subtitle, videos: incomingVideos } = parsedData;
        if (typeof title !== "string" ||
            typeof subtitle !== "string" ||
            !Array.isArray(incomingVideos)) {
            return res.status(400).json({
                success: false,
                message: "Invalid video gallery data",
            });
        }
        // Safely cast the files array since upload.array() ensures it's an array of Multer files
        const files = req.files || [];
        // 3. Process uploads and map placeholders to real R2 URLs
        let fileIndex = 0;
        const processedVideos = [];
        for (const video of incomingVideos) {
            let thumbnailUrl = video.thumbnail === "__NEW_FILE__" ? "" : video.thumbnail || "";
            if (video.thumbnail === "__NEW_FILE__") {
                const file = files[fileIndex++];
                if (!file) {
                    return res.status(400).json({
                        success: false,
                        message: "A selected thumbnail file was not received",
                    });
                }
                try {
                    thumbnailUrl = await uploadToR2(file, "video-gallery/thumbnails");
                }
                catch (uploadError) {
                    console.error(`[Upload] Failed to upload thumbnail for ${video.youtubeId}:`, uploadError);
                    throw new ThumbnailUploadError("Failed to upload video thumbnail");
                }
            }
            processedVideos.push({
                youtubeId: video.youtubeId,
                thumbnail: thumbnailUrl,
                order: video.order || 0,
                isActive: video.isActive !== false,
            });
        }
        if (fileIndex !== files.length) {
            return res.status(400).json({
                success: false,
                message: "Received an unexpected number of thumbnail files",
            });
        }
        // 4. Fetch existing gallery to check for orphaned R2 images
        const existingGallery = await VideoGallery_1.default.findOne();
        const existingThumbnails = existingGallery?.videos
            ?.map((v) => v.thumbnail)
            .filter((url) => url && !url.startsWith("data:")) || [];
        // 5. Save before cleaning up thumbnails no longer referenced by the gallery.
        const updatedGallery = await VideoGallery_1.default.findOneAndUpdate({}, { title, subtitle, videos: processedVideos }, { new: true, upsert: true, runValidators: true });
        const newThumbnailUrls = processedVideos
            .map((v) => v.thumbnail)
            .filter((url) => url);
        // ✅ FIXED: Strict TypeScript typing to prevent TS7006 implicit any error
        const orphanedThumbnails = existingThumbnails.filter((oldUrl) => !newThumbnailUrls.includes(oldUrl));
        if (orphanedThumbnails.length > 0) {
            console.log(`[Cleanup] Deleting ${orphanedThumbnails.length} orphaned thumbnails from R2...`);
            // Run deletions in background to avoid blocking the database save
            // ✅ FIXED: Strict TypeScript typing to prevent TS7006 implicit any error
            Promise.all(orphanedThumbnails.map((url) => deleteFromR2(url))).catch((err) => {
                console.error("[Cleanup] Error deleting orphaned thumbnails:", err);
            });
        }
        res.status(200).json({ success: true, data: updatedGallery });
    }
    catch (error) {
        // Handle JSON parse errors or validation errors safely
        console.error("[Video Gallery] Failed to save gallery:", error);
        const isInvalidJson = error instanceof SyntaxError;
        const message = isInvalidJson
            ? "Invalid JSON payload"
            : error instanceof ThumbnailUploadError
                ? error.message
                : "Failed to save video gallery";
        res
            .status(isInvalidJson ? 400 : error instanceof ThumbnailUploadError ? 502 : 500)
            .json({ success: false, message });
    }
};
exports.upsertVideoGallery = upsertVideoGallery;
const deleteVideo = async (req, res) => {
    try {
        const { youtubeId } = req.params;
        const gallery = await VideoGallery_1.default.findOne();
        if (!gallery) {
            return res
                .status(404)
                .json({ success: false, message: "Gallery not found" });
        }
        // ✅ FIX: Added explicit type (v: IVideoItem) to the find callback
        const videoToDelete = gallery.videos.find((v) => v.youtubeId === youtubeId);
        if (!videoToDelete) {
            return res
                .status(404)
                .json({ success: false, message: "Video not found in gallery" });
        }
        // Delete the thumbnail from R2 if it exists and isn't a base64 string
        if (videoToDelete.thumbnail &&
            !videoToDelete.thumbnail.startsWith("data:")) {
            await deleteFromR2(videoToDelete.thumbnail);
        }
        // Remove video from the array using MongoDB $pull
        await VideoGallery_1.default.updateOne({}, { $pull: { videos: { youtubeId } } });
        res
            .status(200)
            .json({ success: true, message: "Video deleted successfully" });
    }
    catch (error) {
        res
            .status(500)
            .json({ success: false, message: error.message || "Server Error" });
    }
};
exports.deleteVideo = deleteVideo;
