// backend/src/routes/featureCoursesBannerRoutes.ts

import { Router } from "express";
import {
  getActiveBanner,
  listBanners,
  getBannerById,
  createBanner,
  updateBanner,
  deleteBanner,
} from "../controllers/featureCoursesBannerControllers";
import { uploadSingleImage, uploadToR2 } from "../middleware/upload";

const router = Router();

// ---------- Public (No Auth/Multipart needed) ----------
router.get("/", getActiveBanner); // ?lang=en

// ---------- Admin ----------
router.get("/admin/list", listBanners);
router.get("/admin/:id", getBannerById);

// Create: Expects multipart/form-data.
// uploadSingleImage("image") grabs the file, uploadToR2 uploads to Cloudflare R2 & attaches req.imageUrl
router.post("/admin", uploadSingleImage("image"), uploadToR2, createBanner);

// Update: Expects multipart/form-data.
// If a new "image" file is provided, it replaces the old one in R2.
// If no file is provided, only text fields (link, active, etc.) are updated.
router.put("/admin/:id", uploadSingleImage("image"), uploadToR2, updateBanner);

// Delete: Removes DB record and deletes image from R2
router.delete("/admin/:id", deleteBanner);

export default router;
