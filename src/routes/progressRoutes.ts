// src/routes/progressRoutes.ts
import express from "express";
import { protect } from "../middleware/auth"; // Make sure this path matches your project structure
import {
  getCourseProgress,
  updateLastAccessedLesson,
  markLessonComplete,
} from "../controllers/progressController"; // Make sure this path matches your project structure

const router = express.Router();

// GET & PATCH /api/courses/:courseId/progress
router
  .route("/:courseId/progress")
  .get(protect, getCourseProgress)
  .patch(protect, updateLastAccessedLesson);

// POST /api/courses/:courseId/modules/:moduleId/lessons/:lessonId/complete
router
  .route("/:courseId/modules/:moduleId/lessons/:lessonId/complete")
  .post(protect, markLessonComplete);

export default router;
