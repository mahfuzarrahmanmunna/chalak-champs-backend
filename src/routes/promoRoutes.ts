// src/routes/promoRoutes.ts
import { Router } from "express";
import * as promoController from "../controllers/promoController";

const router = Router();

router.post("/validate", promoController.validatePromo);

export default router;
