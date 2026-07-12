"use strict";
// backend/src/routes/featureCoursesBannerRoutes.ts
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const featureCoursesBannerControllers_1 = require("../controllers/featureCoursesBannerControllers");
const upload_1 = require("../middleware/upload");
const router = (0, express_1.Router)();
// ---------- Public (No Auth/Multipart needed) ----------
router.get("/", featureCoursesBannerControllers_1.getActiveBanner); // ?lang=en
// ---------- Admin ----------
router.get("/admin/list", featureCoursesBannerControllers_1.listBanners);
router.get("/admin/:id", featureCoursesBannerControllers_1.getBannerById);
// Create: Expects multipart/form-data.
// uploadSingleImage("image") grabs the file, uploadToR2 uploads to Cloudflare R2 & attaches req.imageUrl
router.post("/admin", (0, upload_1.uploadSingleImage)("image"), upload_1.uploadToR2, featureCoursesBannerControllers_1.createBanner);
// Update: Expects multipart/form-data.
// If a new "image" file is provided, it replaces the old one in R2.
// If no file is provided, only text fields (link, active, etc.) are updated.
router.put("/admin/:id", (0, upload_1.uploadSingleImage)("image"), upload_1.uploadToR2, featureCoursesBannerControllers_1.updateBanner);
// Delete: Removes DB record and deletes image from R2
router.delete("/admin/:id", featureCoursesBannerControllers_1.deleteBanner);
exports.default = router;
