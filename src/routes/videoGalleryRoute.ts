import { ErrorRequestHandler, Router } from "express";
import multer from "multer";
import * as videoGalleryController from "../controllers/videoGalleryController";
import { uploadVideoThumbnails } from "../middleware/upload";

const router = Router();

const handleThumbnailUploadError: ErrorRequestHandler = (
  error,
  _req,
  res,
  next,
) => {
  if (res.headersSent) {
    next(error);
    return;
  }

  const message =
    error instanceof Error ? error.message : "Invalid thumbnail upload";
  const status =
    error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE"
      ? 413
      : 400;

  res.status(status).json({ success: false, message });
};

router.get("/", videoGalleryController.getVideoGallery);

router.post(
  "/",
  uploadVideoThumbnails,
  handleThumbnailUploadError,
  videoGalleryController.upsertVideoGallery,
);


router.delete("/:youtubeId", videoGalleryController.deleteVideo);

export default router;