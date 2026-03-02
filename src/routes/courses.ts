// src/routes/courses.ts
import express from "express";
import {
  createCourse,
  deleteCourse,
  getCourseById,
  getCourses,
  getCoursesByInstructor,
  publishCourse,
  unpublishCourse,
  updateCourse,
} from "../controllers/CourseController";
import { protect, authorize } from "../middleware/auth";
import { uploadCourseFiles } from "../middleware/upload";
import { validateCourse } from "../middleware/validation";

const router = express.Router();

// Public routes
router.get("/", getCourses);
router.get("/:id", getCourseById);

// Protected routes
router.use(protect); // All routes below this require authentication

// Instructor routes
router.post(
  "/",
  authorize("instructor", "admin"),
  uploadCourseFiles,
  validateCourse,
  createCourse,
);

router.get(
  "/instructor/my-courses",
  authorize("instructor", "admin"),
  getCoursesByInstructor,
);

router.put(
  "/:id",
  authorize("instructor", "admin"),
  uploadCourseFiles,
  updateCourse,
);

router.delete("/:id", authorize("instructor", "admin"), deleteCourse);

router.patch("/:id/publish", authorize("instructor", "admin"), publishCourse);

router.patch(
  "/:id/unpublish",
  authorize("instructor", "admin"),
  unpublishCourse,
);

export default router;
