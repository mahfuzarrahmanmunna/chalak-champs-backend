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

    // Safely cast the files array since upload.array() ensures it's an array of Multer files
    const files = (req.files as Express.Multer.File[]) || [];

    // 2. Fetch existing gallery to check for orphaned R2 images
    const existingGallery = await VideoGallery.findOne();
    const existingThumbnails =
      existingGallery?.videos
        ?.map((v: IVideoItem) => v.thumbnail)
        .filter((url: string) => url && !url.startsWith("data:")) || [];

    // 3. Process uploads and map placeholders to real R2 URLs
    let fileIndex = 0;

    const processedVideos: IVideoItem[] = await Promise.all(
      incomingVideos.map(async (v: VideoPayloadItem): Promise<IVideoItem> => {
        let thumbnailUrl =
          v.thumbnail === "__NEW_FILE__" ? "" : v.thumbnail || "";

        if (v.thumbnail === "__NEW_FILE__" && files[fileIndex]) {
          try {
            thumbnailUrl = await uploadToR2(
              files[fileIndex],
              "video-gallery/thumbnails",
            );
          } catch (uploadError) {
            console.error(
              `[Upload] Failed to upload thumbnail for ${v.youtubeId}:`,
              uploadError,
            );
          }
          fileIndex++;
        }

        return {
          youtubeId: v.youtubeId,
          thumbnail: thumbnailUrl,
          order: v.order || 0,
          isActive: v.isActive !== false,
        };
      }),
    );

    // 4. Clean up orphaned R2 thumbnails (if a user deleted a video or replaced an image)
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

    // 5. Save to database
    const updatedGallery = await VideoGallery.findOneAndUpdate(
      {},
      { title, subtitle, videos: processedVideos },
      { new: true, upsert: true, runValidators: true },
    );

    res.status(200).json({ success: true, data: updatedGallery });
  } catch (error: any) {
    // Handle JSON parse errors or validation errors safely
    const message =
      error instanceof SyntaxError
        ? "Invalid JSON payload"
        : error.message || "Server Error";

    res.status(500).json({ success: false, message });
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
