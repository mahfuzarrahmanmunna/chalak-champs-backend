import { Router } from "express";
import multer from "multer";
import * as videoGalleryController from "../controllers/videoGalleryController";

const router = Router();

// Use memory storage so we can pass the buffer to R2Service
const upload = multer({ storage: multer.memoryStorage() });

router.get("/", videoGalleryController.getVideoGallery);

// ✅ FIX: Changed from upload.any() to upload.array("thumbnails")
// This strictly looks for the "thumbnails" field and correctly types req.files as an array
router.post("/", upload.array("thumbnails"), videoGalleryController.upsertVideoGallery);

router.delete("/:youtubeId", videoGalleryController.deleteVideo);

export default router;