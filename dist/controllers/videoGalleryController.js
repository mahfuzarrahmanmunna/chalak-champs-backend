"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.upsertVideoGallery = exports.getVideoGallery = void 0;
const VideoGallery_1 = __importDefault(require("../models/VideoGallery")); // Import IVideoItem
const getVideoGallery = async (req, res) => {
    try {
        // Fetch the single document, or return default empty state
        let gallery = await VideoGallery_1.default.findOne();
        if (!gallery) {
            gallery = await VideoGallery_1.default.create({
                title: "কেন আমরাই শিক্ষার্থী ও অভিভাবকদের প্রথম পছন্দ",
                subtitle: "Default Subtitle",
                videos: [],
            });
        }
        // FIX: Add explicit types to the callback parameters
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
// Admin endpoint to upsert the entire section
const upsertVideoGallery = async (req, res) => {
    try {
        const { title, subtitle, videos } = req.body;
        const updatedGallery = await VideoGallery_1.default.findOneAndUpdate({}, // Find the single document
        { title, subtitle, videos }, { new: true, upsert: true, runValidators: true });
        res.status(200).json({ success: true, data: updatedGallery });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message || "Server Error" });
    }
};
exports.upsertVideoGallery = upsertVideoGallery;
