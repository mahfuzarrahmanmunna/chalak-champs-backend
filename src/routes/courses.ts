import express from "express";
import {
  createCourse,
  getAllCourses,
  getCourseById,
  updateCourse,
  deleteCourse,
  getInstructorCourses,
  getCourseBySlug,
  getAdminCourses,
} from "../controllers/CourseController";
import { protect, authorize } from "../middleware/auth";
import multer from "multer";
import {
  createModule,
  getCourseModules,
  updateModule,
  deleteModule,
  deleteLesson,
} from "../controllers/moduleController";
import {
  getAvailableExams,
  updateLesson,
  createLesson,
} from "../controllers/lessonController";
import { markLessonComplete } from "../controllers/progressController";

const storage = multer.memoryStorage();
const upload = multer({ storage, limits: { fileSize: 500 * 1024 * 1024 } });

// Groups files by fieldname so we can handle thumbnail, video,
// instructorImages (plural), mediaFiles etc.
const uploadAny = (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction,
) => {
  upload.any()(req, res, (err: any) => {
    if (err) return next(err);
    const filesArray = req.files as Express.Multer.File[];
    if (filesArray && filesArray.length > 0) {
      (req as any).files = filesArray.reduce(
        (acc, file) => {
          if (!acc[file.fieldname]) acc[file.fieldname] = [];
          acc[file.fieldname].push(file);
          return acc;
        },
        {} as { [fieldname: string]: Express.Multer.File[] },
      );
    }
    next();
  });
};

const router = express.Router();

// =============================================
// PUBLIC ROUTES
// =============================================
router.get("/", getAllCourses);
router.get("/admin/all", protect, authorize("admin"), getAdminCourses);
router.get("/slug/:slug", getCourseBySlug);
router.get("/:id", getCourseById);

// =============================================
// PROTECTED ROUTES
// =============================================
router.use(protect);

router.get("/instructor/my-courses", getInstructorCourses);

router.post("/", authorize("instructor", "admin"), uploadAny, createCourse);
router.put("/:id", authorize("instructor", "admin"), uploadAny, updateCourse);
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

router.post(
  "/:courseId/modules/:moduleId/lessons/:lessonId/complete",
  protect, // Assuming 'protect' is your auth middleware
  markLessonComplete,
);


export default router;
