// src/routes/courses.ts

import express from "express";
import {
  createCourse,
  getAllCourses,
  getCourseById,
  updateCourse,
  deleteCourse,
  getInstructorCourses,
  getCourseBySlug,
} from "../controllers/CourseController";
import {
  createModule,
  getCourseModules,
  updateModule,
  deleteModule,
  deleteLesson,
} from "../controllers/moduleController";
import { protect, authorize, authenticate } from "../middleware/auth";
import multer from "multer";
import {
  getAvailableExams,
  updateLesson,
  createLesson,
} from "../controllers/lessonController";
// import { uploadToR2 } from "../middleware/upload"; // ✅ Removed unused import

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB
});

// ✅ FIX: Custom middleware to prevent "Unexpected field" error
const uploadAny = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  upload.any()(req, res, (err: any) => {
    if (err) return next(err);
    
    const filesArray = req.files as Express.Multer.File[];
    if (filesArray && filesArray.length > 0) {
      (req as any).files = filesArray.reduce((acc, file) => {
        if (!acc[file.fieldname]) acc[file.fieldname] = [];
        acc[file.fieldname].push(file);
        return acc;
      }, {} as { [fieldname: string]: Express.Multer.File[] });
    }
    
    next();
  });
};

const router = express.Router();

// =============================================
// PUBLIC ROUTES (No auth required)
// =============================================
router.get("/", getAllCourses);
router.get("/slug/:slug", getCourseBySlug);
router.get("/:id", getCourseById);

// =============================================
// PROTECTED ROUTES (Auth required)
// =============================================
router.use(protect);

// --- Instructor Routes ---
router.get("/instructor/my-courses", getInstructorCourses);

// --- Course CRUD ---
router.post(
  "/",
  authorize("instructor", "admin"),
  uploadAny,
  createCourse,
);

// ✅ FIX: Kept ONLY THIS ONE update route. The duplicate at the bottom has been deleted.
router.put(
  "/:id",
  authorize("instructor", "admin"),
  uploadAny,
  updateCourse,
);

router.delete("/:id", authorize("instructor", "admin"), deleteCourse);

// =============================================
// MODULE ROUTES
// =============================================
router.get("/:courseId/modules", getCourseModules);

router.post(
  "/:courseId/modules",
  authorize("instructor", "admin"),
  upload.fields([
    { name: "thumbnail", maxCount: 1 },
    { name: "video", maxCount: 1 },
  ]),
  createModule,
);

router.put(
  "/:courseId/modules/:moduleId",
  authorize("instructor", "admin"),
  upload.fields([
    { name: "thumbnail", maxCount: 1 },
    { name: "video", maxCount: 1 },
  ]),
  updateModule,
);

router.delete(
  "/:courseId/modules/:moduleId",
  authorize("instructor", "admin"),
  deleteModule,
);

// =============================================
// LESSON ROUTES
// =============================================
router.get(
  "/:courseId/modules/available-exams",
  authorize("instructor", "admin"),
  getAvailableExams,
);

router.post(
  "/:courseId/modules/:moduleId/lessons",
  authorize("instructor", "admin"),
  upload.fields([
    { name: "thumbnail", maxCount: 1 },
    { name: "video", maxCount: 1 },
  ]),
  createLesson,
);

router.put(
  "/:courseId/modules/:moduleId/lessons/:lessonId",
  authorize("instructor", "admin"),
  upload.fields([
    { name: "thumbnail", maxCount: 1 },
    { name: "video", maxCount: 1 },
  ]),
  updateLesson,
);

router.delete(
  "/:courseId/modules/:moduleId/lessons/:lessonId",
  authorize("instructor", "admin"),
  deleteLesson,
);

export default router;