import { Request, Response, RequestHandler } from "express";
import multer, { MulterError } from "multer";
import Hero from "../models/Hero";
import { R2Service } from "../services/r2.service";
import { maxImageSizeBytes, r2PublicUrl } from "../config/r2";

// Image types accepted for hero uploads (king image + video thumbnail)
const HERO_IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/pjpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
];

const R2_THUMBNAIL_FOLDER = "hero/video-thumbnails";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: maxImageSizeBytes, files: 2 },
  fileFilter: (_req, file, cb) => {
    if (!HERO_IMAGE_MIME_TYPES.includes(file.mimetype)) {
      cb(new Error("Unsupported image type. Allowed: JPG, JPEG, PNG, WEBP, GIF, AVIF"));
      return;
    }
    cb(null, true);
  },
}).fields([
  { name: "kingImage", maxCount: 1 },
  { name: "videoThumbnail", maxCount: 1 },
]);

type HeroFiles = Partial<Record<"kingImage" | "videoThumbnail", Express.Multer.File[]>>;

// Only delete objects that actually live in our R2 bucket
const isR2Url = (url?: string | null): url is string => {
  if (!url) return false;
  const base = r2PublicUrl.trim().replace(/\/+$/, "").replace(/^https?:\/\//i, "");
  return !!base && url.replace(/^https?:\/\//i, "").startsWith(`${base}/`);
};

const deleteR2ImageSafely = async (url?: string | null) => {
  if (!isR2Url(url)) return;
  try {
    await R2Service.deleteFile(R2Service.extractKeyFromUrl(url));
  } catch (error) {
    console.error("[Hero] Failed to delete old R2 image:", url, error);
  }
};

export const getHero = async (req: Request, res: Response) => {
  try {
    const { lang } = req.params;
    const hero = await Hero.findOne({ lang });
    if (!hero) return res.status(200).json({ success: true, data: null });
    res.status(200).json({ success: true, data: hero });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

export const upsertHero: RequestHandler = (req, res) => {
  upload(req, res, async (err) => {
    if (err) {
      const message =
        err instanceof MulterError && err.code === "LIMIT_FILE_SIZE"
          ? `Image too large. Max size is ${Math.round(maxImageSizeBytes / (1024 * 1024))}MB`
          : err.message || "File upload error or invalid file type.";
      return res.status(400).json({ success: false, message });
    }

    let uploadedThumbnailUrl: string | null = null;

    try {
      const {
        lang,
        title,
        subtitle,
        ctaButton,
        secondaryLink,
        cta2,
        cta2Btn,
        kingImageClass,
        videoId,
      } = req.body;

      if (!lang || !title || !subtitle) {
        return res.status(400).json({ success: false, message: "Language, Title, and Subtitle are required" });
      }

      const files = (req.files || {}) as HeroFiles;
      const kingFile = files.kingImage?.[0];
      const thumbFile = files.videoThumbnail?.[0];

      const existing = await Hero.findOne({ lang }).select("videoThumbnail").lean();
      const previousThumbnail = existing?.videoThumbnail || "";

      // King image (unchanged behaviour: stored inline)
      let kingImage = req.body.kingImage;
      if (kingFile) {
        kingImage = `data:${kingFile.mimetype};base64,${kingFile.buffer.toString("base64")}`;
      }

      // Video thumbnail -> Cloudflare R2
      // - new file uploaded  -> upload to R2, store public URL
      // - text field sent    -> keep that URL ("" means the admin removed it)
      // - field not sent     -> keep whatever is stored
      let videoThumbnail: string = previousThumbnail;
      if (thumbFile) {
        const mimeType = ["image/jpg", "image/pjpeg"].includes(thumbFile.mimetype) ? "image/jpeg" : thumbFile.mimetype;
        const result = await R2Service.uploadImage(thumbFile.buffer, mimeType, R2_THUMBNAIL_FOLDER);
        uploadedThumbnailUrl = result.url;
        videoThumbnail = result.url;
      } else if (typeof req.body.videoThumbnail === "string") {
        videoThumbnail = req.body.videoThumbnail.trim();
      }

      const updatedHero = await Hero.findOneAndUpdate(
        { lang },
        {
          title,
          subtitle,
          ctaButton,
          secondaryLink,
          cta2,
          cta2Btn,
          kingImage,
          kingImageClass,
          videoId,
          videoThumbnail,
        },
        { new: true, upsert: true, runValidators: true }
      );

      // Clean up the old thumbnail from R2 once it is no longer referenced
      if (previousThumbnail && previousThumbnail !== videoThumbnail) {
        const stillUsed = await Hero.exists({ videoThumbnail: previousThumbnail });
        if (!stillUsed) await deleteR2ImageSafely(previousThumbnail);
      }

      res.status(200).json({ success: true, data: updatedHero });
    } catch (error: any) {
      // Roll back an orphaned upload if the DB save failed
      if (uploadedThumbnailUrl) await deleteR2ImageSafely(uploadedThumbnailUrl);
      res.status(500).json({ success: false, message: error.message || "Server Error" });
    }
  });
};
