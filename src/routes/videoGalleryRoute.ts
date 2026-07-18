import { Router } from "express";
import * as videoGalleryController from "../controllers/videoGalleryController";

const router = Router();

router.get("/", videoGalleryController.getVideoGallery);
router.post("/", videoGalleryController.upsertVideoGallery);

export default router;