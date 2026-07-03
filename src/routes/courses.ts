// src/routes/courses.ts

import express from "express";
import {
  createCourse,
  getAllCourses,
  getCourseById,
  updateCourse,
  deleteCourse,
  getInstructorCourses,
} from "../controllers/CourseController";
import {
  createModule,
  getCourseModules,
  updateModule,
  deleteModule,
  deleteLesson,
} from "../controllers/moduleController";
import { protect, authorize } from "../middleware/auth";
import multer from "multer";
import {
  getAvailableExams,
  updateLesson,
  createLesson,
} from "../controllers/lessonController";

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB
});

const router = express.Router();

// =============================================
// PUBLIC ROUTES (No auth required)
// =============================================
router.get("/", getAllCourses);
router.get("/:id", getCourseById);

// =============================================
// PROTECTED ROUTES (Auth required below this line)
// =============================================
router.use(protect);

// --- Instructor Routes ---
router.get("/instructor/my-courses", getInstructorCourses);

// --- Course CRUD ---
router.post(
  "/",
  authorize("instructor", "admin"),
  upload.fields([
    { name: "thumbnail", maxCount: 1 },
    { name: "video", maxCount: 1 },
  ]),
  createCourse,
);

router.put(
  "/:id",
  authorize("instructor", "admin"),
  upload.fields([
    { name: "thumbnail", maxCount: 1 },
    { name: "video", maxCount: 1 },
  ]),
  updateCourse,
);

router.delete("/:id", authorize("instructor", "admin"), deleteCourse);

// =============================================
// MODULE ROUTES (Nested under :courseId)
// These paths MUST match what the frontend calls:
//   GET    /api/courses/:courseId/modules
//   POST   /api/courses/:courseId/modules
//   PUT    /api/courses/:courseId/modules/:moduleId
//   DELETE /api/courses/:courseId/modules/:moduleId
// =============================================

// Get all modules for a course (with lessons populated)
router.get("/:courseId/modules", getCourseModules);

// Create a new module in a course
router.post(
  "/:courseId/modules",
  authorize("instructor", "admin"),
  upload.fields([
    { name: "thumbnail", maxCount: 1 },
    { name: "video", maxCount: 1 },
  ]),
  createModule,
);

// ✅ FIXED: Added :courseId prefix to match frontend
// Update a specific module
router.put(
  "/:courseId/modules/:moduleId",
  authorize("instructor", "admin"),
  upload.fields([
    { name: "thumbnail", maxCount: 1 },
    { name: "video", maxCount: 1 },
  ]),
  updateModule,
);

// ✅ FIXED: Added :courseId prefix to match frontend
// Delete a specific module (and its lessons)
router.delete(
  "/:courseId/modules/:moduleId",
  authorize("instructor", "admin"),
  deleteModule,
);

// =============================================
// LESSON ROUTES (Nested under :courseId/modules/:moduleId)
// =============================================

// ✅ FIXED: Added :courseId prefix to match frontend
// Create a lesson inside a specific module
router.post(
  "/:courseId/modules/:moduleId/lessons",
  authorize("instructor", "admin"),
  upload.fields([
    { name: "thumbnail", maxCount: 1 },
    { name: "video", maxCount: 1 },
  ]),
  createLesson,
);

router.get(
  "/:courseId/modules/available-exams",
  authorize("instructor", "admin"),
  getAvailableExams,
);

// Create a lesson inside a specific module (UPDATED)
router.post(
  "/:courseId/modules/:moduleId/lessons",
  authorize("instructor", "admin"),
  upload.fields([
    { name: "thumbnail", maxCount: 1 },
    { name: "video", maxCount: 1 },
  ]),
  createLesson,
);

// ✅ NEW: Update a lesson
router.put(
  "/:courseId/modules/:moduleId/lessons/:lessonId",
  authorize("instructor", "admin"),
  upload.fields([
    { name: "thumbnail", maxCount: 1 },
    { name: "video", maxCount: 1 },
  ]),
  updateLesson,
);

// Delete a specific lesson
router.delete(
  "/:courseId/modules/:moduleId/lessons/:lessonId",
  authorize("instructor", "admin"),
  deleteLesson,
);

// Delete a specific lesson
router.delete(
  "/:courseId/modules/:moduleId/lessons/:lessonId",
  authorize("instructor", "admin"),
  deleteLesson,
);

export default router;
