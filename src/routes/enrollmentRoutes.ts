// src/routes/enrollmentRoutes.ts
import { Router } from "express";
import * as enrollmentController from "../controllers/enrollmentController";

const router = Router();

// Public route for enrollment
router.post("/", enrollmentController.createEnrollment);
router.post("/", enrollmentController.createEnrollment);
router.get("/user/:identifier", enrollmentController.createEnrollment);


export default router;
