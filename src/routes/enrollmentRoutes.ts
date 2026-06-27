// src/routes/enrollmentRoutes.ts
import { Router } from "express";
import * as enrollmentController from "../controllers/enrollmentController";

const router = Router();

// Public route for enrollment
router.post("/", enrollmentController.createEnrollment);

export default router;
