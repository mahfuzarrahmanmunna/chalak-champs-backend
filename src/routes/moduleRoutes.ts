// src/routes/moduleRoutes.ts
import { Router } from "express";
import multer from "multer";
import { protect, authorize } from "../middleware/auth";
import * as moduleController from "../controllers/moduleController";

const router = Router();

// Multer for file uploads (if needed in future)
const upload = multer({ storage: multer.memoryStorage() });

// --- MODULE ROUTES ---

// Get modules for a specific course
router.get(
  "/:courseId",
  protect,
  authorize("instructor", "admin"),
  moduleController.getCourseModules,
);

// Create a new module
router.post(
  "/:courseId",
  protect,
  authorize("instructor", "admin"),
  upload.fields([{ name: "thumbnail", maxCount: 1 }]), // Handle thumbnail if needed
  moduleController.createModule,
);

// Update a module
router.put(
  "/:id",
  protect,
  authorize("instructor", "admin"),
  moduleController.updateModule,
);

// Delete a module
router.delete(
  "/:id",
  protect,
  authorize("instructor", "admin"),
  moduleController.deleteModule,
);

// --- LESSON ROUTES (Nested) ---

// Create a lesson inside a specific module
router.post(
  "/:moduleId/lessons",
  protect,
  authorize("instructor", "admin"),
  moduleController.createLesson,
);

// Delete a lesson
router.delete(
  "/lessons/:id",
  protect,
  authorize("instructor", "admin"),
  moduleController.deleteLesson,
);

export default router;
