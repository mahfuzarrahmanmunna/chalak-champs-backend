import { Request, Response } from "express";
import VideoGallery, { IVideoItem } from "../models/VideoGallery";
import { R2Service } from "../services/r2.service";

// --- HELPERS ---
const uploadToR2 = async (
  file: Express.Multer.File,
  folder: string,
): Promise<{ url: string; key: string }> => {
  if (!file.buffer?.length) {
    throw new Error(`Empty file buffer for ${file.originalname}`);
  }
  const subFolder = "images";
  return R2Service.uploadFile(file.buffer, file.mimetype, `${folder}/${subFolder}`);
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

// ✅ FIX: Reverted to standard Request, and safely cast files inside
export const upsertVideoGallery = async (req: Request, res: Response) => {
  try {
    const parsedData = JSON.parse(req.body.data);
    const { title, subtitle, videos } = parsedData;
    
    // Safely cast the files array since upload.array() ensures it's an array of Multer files
    const files = (req.files as Express.Multer.File[]) || [];

    let fileIndex = 0;
    
    // ✅ FIX: Added 'async' to the map callback to allow 'await' inside
    const processedVideos = await Promise.all(
      videos.map(async (v: { youtubeId: string; thumbnail: string; order: number; isActive: boolean }) => {
        let thumbnailUrl = v.thumbnail === "__NEW_FILE__" ? "" : (v.thumbnail || "");

        if (v.thumbnail === "__NEW_FILE__" && files[fileIndex]) {
          try {
            const result = await uploadToR2(files[fileIndex], "video-gallery/thumbnails");
            thumbnailUrl = result.url;
          } catch (uploadError) {
            console.error("Failed to upload thumbnail:", uploadError);
          }
          fileIndex++;
        }

        return {
          youtubeId: v.youtubeId,
          thumbnail: thumbnailUrl,
          order: v.order || 0,
          isActive: v.isActive !== false,
        };
      })
    );

    const updatedGallery = await VideoGallery.findOneAndUpdate(
      {}, 
      { title, subtitle, videos: processedVideos },
      { new: true, upsert: true, runValidators: true }
    );

    res.status(200).json({ success: true, data: updatedGallery });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || "Server Error" });
  }
};


export const deleteVideo = async (req: Request, res: Response) => {
  try {
    const { youtubeId } = req.params;

    const gallery = await VideoGallery.findOne();
    if (!gallery) {
      return res.status(404).json({ success: false, message: "Gallery not found" });
    }

    // ✅ FIX: Added explicit type (v: IVideoItem) to the find callback
    const videoToDelete = gallery.videos.find((v: IVideoItem) => v.youtubeId === youtubeId);
    if (!videoToDelete) {
      return res.status(404).json({ success: false, message: "Video not found in gallery" });
    }

    if (videoToDelete.thumbnail) {
      await deleteFromR2(videoToDelete.thumbnail);
    }

    await VideoGallery.updateOne(
      {},
      { $pull: { videos: { youtubeId } } }
    );

    res.status(200).json({ success: true, message: "Video deleted successfully" });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || "Server Error" });
  }
};