import express from "express";
import {
  createCourse,
  getAllCourses,
  getCourseById,
  updateCourse,
  deleteCourse,
  getInstructorCourses,
} from "../controllers/CourseController";
import { protect, authorize } from "../middleware/auth";
import multer from "multer";
import {
  createLesson,
  createModule,
  deleteLesson,
  deleteModule,
  getCourseModules,
  updateModule,
} from "../controllers/moduleController";

// Use memory storage to avoid filesystem operations (incompatible with Workers)
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB
});

const router = express.Router();

// --- PUBLIC ROUTES ---
router.get("/", getAllCourses);
router.get("/:id", getCourseById);

// --- PROTECTED ROUTES ---
router.use(protect);

router.get("/instructor/my-courses", getInstructorCourses);

// Create Course
router.post(
  "/",
  authorize("instructor", "admin"),
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

router.get("/:id/modules", getCourseModules);
router.post(
  "/:id/modules",
  authorize("instructor", "admin"),
  upload.fields([
    { name: "thumbnail", maxCount: 1 },
    { name: "video", maxCount: 1 },
  ]),
  createModule,
);
router.put(
  "/modules/:id",
  authorize("instructor", "admin"),
  upload.fields([
    { name: "thumbnail", maxCount: 1 },
    { name: "video", maxCount: 1 },
  ]),
  updateModule,
);
router.delete(
  "/modules/:id",
  authorize("instructor", "admin"),
  deleteModule,
);
router.post(
  "/modules/:moduleId/lessons",
  authorize("instructor", "admin"),
  upload.fields([
    { name: "thumbnail", maxCount: 1 },
    { name: "video", maxCount: 1 },
  ]),
  createLesson,
);
router.delete("/lessons/:id", authorize("instructor", "admin"), deleteLesson);

// Delete Course
router.delete("/:id", authorize("instructor", "admin"), deleteCourse);

export default router;
