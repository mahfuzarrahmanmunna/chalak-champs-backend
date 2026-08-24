"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteVideo = exports.upsertVideoGallery = exports.getVideoGallery = void 0;
const VideoGallery_1 = __importDefault(require("../models/VideoGallery"));
const r2_service_1 = require("../services/r2.service");
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
        // Safely cast the files array since upload.array() ensures it's an array of Multer files
        const files = req.files || [];
        // 2. Fetch existing gallery to check for orphaned R2 images
        const existingGallery = await VideoGallery_1.default.findOne();
        const existingThumbnails = existingGallery?.videos
            ?.map((v) => v.thumbnail)
            .filter((url) => url && !url.startsWith("data:")) || [];
        // 3. Process uploads and map placeholders to real R2 URLs
        let fileIndex = 0;
        const processedVideos = await Promise.all(incomingVideos.map(async (v) => {
            let thumbnailUrl = v.thumbnail === "__NEW_FILE__" ? "" : v.thumbnail || "";
            if (v.thumbnail === "__NEW_FILE__" && files[fileIndex]) {
                try {
                    thumbnailUrl = await uploadToR2(files[fileIndex], "video-gallery/thumbnails");
                }
                catch (uploadError) {
                    console.error(`[Upload] Failed to upload thumbnail for ${v.youtubeId}:`, uploadError);
                }
                fileIndex++;
            }
            return {
                youtubeId: v.youtubeId,
                thumbnail: thumbnailUrl,
                order: v.order || 0,
                isActive: v.isActive !== false,
            };
        }));
        // 4. Clean up orphaned R2 thumbnails (if a user deleted a video or replaced an image)
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
        // 5. Save to database
        const updatedGallery = await VideoGallery_1.default.findOneAndUpdate({}, { title, subtitle, videos: processedVideos }, { new: true, upsert: true, runValidators: true });
        res.status(200).json({ success: true, data: updatedGallery });
    }
    catch (error) {
        // Handle JSON parse errors or validation errors safely
        const message = error instanceof SyntaxError
            ? "Invalid JSON payload"
            : error.message || "Server Error";
        res.status(500).json({ success: false, message });
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
