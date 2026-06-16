import express from "express";
import { protect, authorize } from "../middleware/auth";
import multer from "multer";
// Import the controller functions
import {
  createModule,
  getCourseModules,
  updateModule,
  deleteModule,
  createLesson,
} from "../controllers/moduleController";

const router = express.Router();

// Multer configuration for file uploads
// IMPORTANT: This is required to parse FormData sent from the frontend
const upload = multer({
  storage: multer.memoryStorage(), // Use memory storage (uploadToImgBB prefers Buffer)
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB
});

// --- MODULE ROUTES ---

// Get modules for a specific course
router.get("/:courseId", getCourseModules);

// Create a new module
// FIX: Added upload.fields to handle FormData (Thumbnail + Video)
router.post(
  "/:courseId", // Changed from "/" to "/:courseId" based on your error URL
  protect,
  authorize("instructor", "admin"),
  upload.fields([
    { name: "thumbnail", maxCount: 1 },
    { name: "video", maxCount: 1 },
  ]),
  createModule,
);

// Update a module
router.put("/:id", updateModule);

// Delete a module
router.delete("/:id", deleteModule);

// --- LESSON ROUTES (Nested inside Modules) ---

// Create a lesson inside a specific module
router.post(
  "/:moduleId/lessons",
  protect,
  authorize("instructor", "admin"),
  upload.fields([
    { name: "thumbnail", maxCount: 1 },
    { name: "video", maxCount: 1 },
  ]),
  createLesson,
);

export default router;
