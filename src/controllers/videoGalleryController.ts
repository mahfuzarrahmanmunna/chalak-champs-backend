import { Request, Response } from "express";
import VideoGallery from "../models/VideoGallery";

export const getVideoGallery = async (req: Request, res: Response) => {
  try {
    // Fetch the single document, or return default empty state
    let gallery = await VideoGallery.findOne();
    
    if (!gallery) {
      gallery = await VideoGallery.create({
        title: "কেন আমরাই শিক্ষার্থী ও অভিভাবকদের প্রথম পছন্দ",
        subtitle: "Default Subtitle",
        videos: [],
      });
    }

    // Filter out inactive videos and sort them
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
  } catch (error) {
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// Admin endpoint to upsert the entire section
export const upsertVideoGallery = async (req: Request, res: Response) => {
  try {
    const { title, subtitle, videos } = req.body;

    const updatedGallery = await VideoGallery.findOneAndUpdate(
      {}, // Find the single document
      { title, subtitle, videos },
      { new: true, upsert: true, runValidators: true }
    );

    res.status(200).json({ success: true, data: updatedGallery });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || "Server Error" });
  }
};