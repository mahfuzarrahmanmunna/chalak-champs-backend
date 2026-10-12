import { Router } from "express";
import * as galleryController from "../controllers/galleryController";

const router = Router();

router.get("/", galleryController.getGallery);
router.post("/", galleryController.upsertGallery);

export default router;