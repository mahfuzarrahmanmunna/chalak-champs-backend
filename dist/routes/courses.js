"use strict";
// src/routes/courses.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const CourseController_1 = require("../controllers/CourseController");
const moduleController_1 = require("../controllers/moduleController");
const auth_1 = require("../middleware/auth");
const multer_1 = __importDefault(require("multer"));
const lessonController_1 = require("../controllers/lessonController");
// import { uploadToR2 } from "../middleware/upload"; // ✅ Removed unused import
const storage = multer_1.default.memoryStorage();
const upload = (0, multer_1.default)({
    storage,
    limits: { fileSize: 500 * 1024 * 1024 }, // 500MB
});
// ✅ FIX: Custom middleware to prevent "Unexpected field" error
const uploadAny = (req, res, next) => {
    upload.any()(req, res, (err) => {
        if (err)
            return next(err);
        const filesArray = req.files;
        if (filesArray && filesArray.length > 0) {
            req.files = filesArray.reduce((acc, file) => {
                if (!acc[file.fieldname])
                    acc[file.fieldname] = [];
                acc[file.fieldname].push(file);
                return acc;
            }, {});
        }
        next();
    });
};
const router = express_1.default.Router();
// =============================================
// PUBLIC ROUTES (No auth required)
// =============================================
router.get("/", CourseController_1.getAllCourses);
router.get("/slug/:slug", CourseController_1.getCourseBySlug);
router.get("/:id", CourseController_1.getCourseById);
// =============================================
// PROTECTED ROUTES (Auth required)
// =============================================
router.use(auth_1.protect);
// --- Instructor Routes ---
router.get("/instructor/my-courses", CourseController_1.getInstructorCourses);
// --- Course CRUD ---
router.post("/", (0, auth_1.authorize)("instructor", "admin"), uploadAny, CourseController_1.createCourse);
// ✅ FIX: Kept ONLY THIS ONE update route. The duplicate at the bottom has been deleted.
router.put("/:id", (0, auth_1.authorize)("instructor", "admin"), uploadAny, CourseController_1.updateCourse);
router.delete("/:id", (0, auth_1.authorize)("instructor", "admin"), CourseController_1.deleteCourse);
// =============================================
// MODULE ROUTES
// =============================================
router.get("/:courseId/modules", moduleController_1.getCourseModules);
router.post("/:courseId/modules", (0, auth_1.authorize)("instructor", "admin"), upload.fields([
    { name: "thumbnail", maxCount: 1 },
    { name: "video", maxCount: 1 },
]), moduleController_1.createModule);
router.put("/:courseId/modules/:moduleId", (0, auth_1.authorize)("instructor", "admin"), upload.fields([
    { name: "thumbnail", maxCount: 1 },
    { name: "video", maxCount: 1 },
]), moduleController_1.updateModule);
router.delete("/:courseId/modules/:moduleId", (0, auth_1.authorize)("instructor", "admin"), moduleController_1.deleteModule);
// =============================================
// LESSON ROUTES
// =============================================
router.get("/:courseId/modules/available-exams", (0, auth_1.authorize)("instructor", "admin"), lessonController_1.getAvailableExams);
router.post("/:courseId/modules/:moduleId/lessons", (0, auth_1.authorize)("instructor", "admin"), upload.fields([
    { name: "thumbnail", maxCount: 1 },
    { name: "video", maxCount: 1 },
]), lessonController_1.createLesson);
router.put("/:courseId/modules/:moduleId/lessons/:lessonId", (0, auth_1.authorize)("instructor", "admin"), upload.fields([
    { name: "thumbnail", maxCount: 1 },
    { name: "video", maxCount: 1 },
]), lessonController_1.updateLesson);
router.delete("/:courseId/modules/:moduleId/lessons/:lessonId", (0, auth_1.authorize)("instructor", "admin"), moduleController_1.deleteLesson);
exports.default = router;
