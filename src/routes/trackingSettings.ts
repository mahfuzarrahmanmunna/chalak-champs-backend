import { Router } from "express";
import { getPublicTrackingSettings } from "../controllers/trackingSettingsController";

const router = Router();

router.get("/public", getPublicTrackingSettings);

export default router;
