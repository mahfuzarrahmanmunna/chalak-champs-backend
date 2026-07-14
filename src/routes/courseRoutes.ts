// src/routes/courseRoutes.ts
import { Router } from "express";
import {
  createCourse,
  getAllCourses,
  getCourseById,
  getCourseBySlug,
  getInstructorCourses,
  updateCourse,
  deleteCourse,
} from "../controllers/CourseController";
import { uploadCourseMedia } from "../middleware/upload";
import { authenticate, authorize } from "../middleware/auth";

const router = Router();

// Public Routes
router.get("/", getAllCourses);
router.get("/slug/:slug", getCourseBySlug);
router.get("/:id", getCourseById);

// Protected Routes (Admin/Instructor only)
router.post(
  "/",
  authenticate,
  authorize("admin", "instructor"),
  uploadCourseMedia,
  createCourse,
);

router.put(
  "/:id",
  authenticate,
  authorize("admin", "instructor"),
  uploadCourseMedia,
  updateCourse,
);

router.delete(
  "/:id",
  authenticate,
  authorize("admin", "instructor"),
  deleteCourse,
);

export default router;