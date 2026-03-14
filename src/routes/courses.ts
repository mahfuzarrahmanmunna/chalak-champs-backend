// src/routes/courses.ts
import express from "express";
import {
  createCourse,
  getCourses,
  getCourseById,
  updateCourse,
  deleteCourse,
  getInstructorCourses,
} from "../controllers/CourseController";
import { protect, authorize } from "../middleware/auth";
import multer from "multer";
import path from "path";
import moduleRoutes from "./moduleRoutes";

// Multer Config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (file.fieldname === "thumbnail") cb(null, "uploads/images/");
    else if (file.fieldname === "video") cb(null, "uploads/videos/");
    else cb(null, "uploads/misc/");
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(
      null,
      file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname),
    );
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB
});

const router = express.Router();

// Public Routes
router.get("/", getCourses);
router.get("/:id", getCourseById);
router.use("/:courseId/modules", moduleRoutes);

// --- PROTECTED ROUTES ---
router.use(protect); // All routes below this line require authentication

router.get("/instructor/my-courses", getInstructorCourses);

// Create Course
router.post(
  "/",
  authorize("instructor", "admin"), // Requires specific role
  upload.fields([
    { name: "thumbnail", maxCount: 1 },
    { name: "video", maxCount: 1 },
  ]),
  createCourse,
);

// Update Course
router.put(
  "/:id",
  authorize("instructor", "admin"),
  upload.fields([
    { name: "thumbnail", maxCount: 1 },
    { name: "video", maxCount: 1 },
  ]),
  updateCourse,
);

// Delete Course
router.delete("/:id", authorize("instructor", "admin"), deleteCourse);

export default router;
