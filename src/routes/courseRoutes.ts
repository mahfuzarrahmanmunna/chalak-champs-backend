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
  getCourseStructure,
  updateModule,
  deleteModule,
  createLesson,
  getLessonById,
  updateLesson,
  deleteLesson,
} from "../controllers/CurriculumController";
import {
  createBatch,
  getBatchesByCourse,
  enrollInBatch,
} from "../controllers/BatchController";
import { protect, authorize } from "../middleware/auth";
import multer from "multer";

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 500 * 1024 * 1024 },
});

const router = express.Router();

// --- PUBLIC ROUTES ---
router.get("/", getAllCourses);
router.get("/:id", getCourseById);

// --- PROTECTED ROUTES ---
router.use(protect);

// 1. Course Level
router.get("/instructor/my-courses", getInstructorCourses);
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

// 2. Curriculum Level
router.get("/:courseId/curriculum", getCourseStructure);

// Modules
router.post(
  "/:courseId/modules",
  authorize("instructor", "admin"),
  createModule,
);
router.put("/modules/:id", authorize("instructor", "admin"), updateModule);
router.delete("/modules/:id", authorize("instructor", "admin"), deleteModule);

// Lessons
router.post(
  "/modules/:moduleId/lessons",
  authorize("instructor", "admin"),
  createLesson,
);
router.get("/lessons/:id", getLessonById); // View specific lesson
router.put("/lessons/:id", authorize("instructor", "admin"), updateLesson);
router.delete("/lessons/:id", authorize("instructor", "admin"), deleteLesson);

// 3. Batch Level
router.post(
  "/:courseId/batches",
  authorize("instructor", "admin"),
  createBatch,
);
router.get("/:courseId/batches", getBatchesByCourse);
router.post("/batches/:batchId/enroll", enrollInBatch);

export default router;
