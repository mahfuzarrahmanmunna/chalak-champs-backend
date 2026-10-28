import { Request, Response } from "express";
import VideoGallery, { IVideoItem } from "../models/VideoGallery";
import { R2Service } from "../services/r2.service";

// --- TYPES ---
interface VideoPayloadItem {
  youtubeId: string;
  thumbnail: string;
  order: number;
  isActive: boolean;
}

class ThumbnailUploadError extends Error {}

// --- HELPERS ---
const uploadToR2 = async (
  file: Express.Multer.File,
  folder: string,
): Promise<string> => {
  if (!file.buffer?.length) {
    throw new Error(`Empty file buffer for ${file.originalname}`);
  }
  const subFolder = "images";
  const result = await R2Service.uploadFile(
    file.buffer,
    file.mimetype,
    `${folder}/${subFolder}`,
  );
  return result.url;
};

const deleteFromR2 = async (url: string): Promise<void> => {
  if (!url) return;
  try {
    const key = R2Service.extractKeyFromUrl(url);
    if (key) {
      await R2Service.deleteFile(key);
    }
  } catch (err) {
    console.error("Failed to delete from R2:", err);
  }
};

// --- CONTROLLERS ---

export const getVideoGallery = async (req: Request, res: Response) => {
  try {
    let gallery = await VideoGallery.findOne();

    if (!gallery) {
      gallery = await VideoGallery.create({
        title: "কেন আমরাই শিক্ষার্থী ও অভিভাবকদের প্রথম পছন্দ",
        subtitle: "Default Subtitle",
        videos: [],
      });
    }

    const activeVideos = gallery.videos
      .filter((v: IVideoItem) => v.isActive)
      .sort((a: IVideoItem, b: IVideoItem) => a.order - b.order);

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

export const upsertVideoGallery = async (req: Request, res: Response) => {
  try {
    // 1. Parse incoming payload
    const parsedData = JSON.parse(req.body.data);
    const { title, subtitle, videos: incomingVideos } = parsedData;
    if (
      typeof title !== "string" ||
      typeof subtitle !== "string" ||
      !Array.isArray(incomingVideos)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid video gallery data",
      });
    }

    // Safely cast the files array since upload.array() ensures it's an array of Multer files
    const files = (req.files as Express.Multer.File[]) || [];

    // 3. Process uploads and map placeholders to real R2 URLs
    let fileIndex = 0;
    const processedVideos: IVideoItem[] = [];

    for (const video of incomingVideos as VideoPayloadItem[]) {
      let thumbnailUrl =
        video.thumbnail === "__NEW_FILE__" ? "" : video.thumbnail || "";

      if (video.thumbnail === "__NEW_FILE__") {
        const file = files[fileIndex++];
        if (!file) {
          return res.status(400).json({
            success: false,
            message: "A selected thumbnail file was not received",
          });
        }

        try {
          thumbnailUrl = await uploadToR2(
            file,
            "video-gallery/thumbnails",
          );
        } catch (uploadError) {
          console.error(
            `[Upload] Failed to upload thumbnail for ${video.youtubeId}:`,
            uploadError,
          );
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
    const existingGallery = await VideoGallery.findOne();
    const existingThumbnails =
      existingGallery?.videos
        ?.map((v: IVideoItem) => v.thumbnail)
        .filter((url: string) => url && !url.startsWith("data:")) || [];

    // 5. Save before cleaning up thumbnails no longer referenced by the gallery.
    const updatedGallery = await VideoGallery.findOneAndUpdate(
      {},
      { title, subtitle, videos: processedVideos },
      { new: true, upsert: true, runValidators: true },
    );

    const newThumbnailUrls = processedVideos
      .map((v: IVideoItem) => v.thumbnail)
      .filter((url: string) => url);

    // ✅ FIXED: Strict TypeScript typing to prevent TS7006 implicit any error
    const orphanedThumbnails = existingThumbnails.filter(
      (oldUrl: string) => !newThumbnailUrls.includes(oldUrl),
    );

    if (orphanedThumbnails.length > 0) {
      console.log(
        `[Cleanup] Deleting ${orphanedThumbnails.length} orphaned thumbnails from R2...`,
      );
      // Run deletions in background to avoid blocking the database save
      // ✅ FIXED: Strict TypeScript typing to prevent TS7006 implicit any error
      Promise.all(
        orphanedThumbnails.map((url: string) => deleteFromR2(url)),
      ).catch((err) => {
        console.error("[Cleanup] Error deleting orphaned thumbnails:", err);
      });
    }

    res.status(200).json({ success: true, data: updatedGallery });
  } catch (error: unknown) {
    // Handle JSON parse errors or validation errors safely
    console.error("[Video Gallery] Failed to save gallery:", error);
    const isInvalidJson = error instanceof SyntaxError;
    const message =
      isInvalidJson
        ? "Invalid JSON payload"
        : error instanceof ThumbnailUploadError
          ? error.message
          : "Failed to save video gallery";

    res
      .status(isInvalidJson ? 400 : error instanceof ThumbnailUploadError ? 502 : 500)
      .json({ success: false, message });
  }
};

export const deleteVideo = async (req: Request, res: Response) => {
  try {
    const { youtubeId } = req.params;

    const gallery = await VideoGallery.findOne();
    if (!gallery) {
      return res
        .status(404)
        .json({ success: false, message: "Gallery not found" });
    }

    // ✅ FIX: Added explicit type (v: IVideoItem) to the find callback
    const videoToDelete = gallery.videos.find(
      (v: IVideoItem) => v.youtubeId === youtubeId,
    );
    if (!videoToDelete) {
      return res
        .status(404)
        .json({ success: false, message: "Video not found in gallery" });
    }

    // Delete the thumbnail from R2 if it exists and isn't a base64 string
    if (
      videoToDelete.thumbnail &&
      !videoToDelete.thumbnail.startsWith("data:")
    ) {
      await deleteFromR2(videoToDelete.thumbnail);
    }

    // Remove video from the array using MongoDB $pull
    await VideoGallery.updateOne({}, { $pull: { videos: { youtubeId } } });

    res
      .status(200)
      .json({ success: true, message: "Video deleted successfully" });
  } catch (error: any) {
    res
      .status(500)
      .json({ success: false, message: error.message || "Server Error" });
  }
};
