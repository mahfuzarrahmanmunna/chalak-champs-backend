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
const storage = multer_1.default.memoryStorage();
const upload = (0, multer_1.default)({
    storage,
    limits: { fileSize: 500 * 1024 * 1024 }, // 500MB
});
const router = express_1.default.Router();
// =============================================
// PUBLIC ROUTES (No auth required)
// =============================================
router.get("/", CourseController_1.getAllCourses);
router.get("/:id", CourseController_1.getCourseById);
// =============================================
// PROTECTED ROUTES (Auth required below this line)
// =============================================
router.use(auth_1.protect);
// --- Instructor Routes ---
router.get("/instructor/my-courses", CourseController_1.getInstructorCourses);
// --- Course CRUD ---
router.post("/", (0, auth_1.authorize)("instructor", "admin"), upload.fields([
    { name: "thumbnail", maxCount: 1 },
    { name: "video", maxCount: 1 },
]), CourseController_1.createCourse);
router.put("/:id", (0, auth_1.authorize)("instructor", "admin"), upload.fields([
    { name: "thumbnail", maxCount: 1 },
    { name: "video", maxCount: 1 },
]), CourseController_1.updateCourse);
router.delete("/:id", (0, auth_1.authorize)("instructor", "admin"), CourseController_1.deleteCourse);
// =============================================
// MODULE ROUTES (Nested under :courseId)
// These paths MUST match what the frontend calls:
//   GET    /api/courses/:courseId/modules
//   POST   /api/courses/:courseId/modules
//   PUT    /api/courses/:courseId/modules/:moduleId
//   DELETE /api/courses/:courseId/modules/:moduleId
// =============================================
// Get all modules for a course (with lessons populated)
router.get("/:courseId/modules", moduleController_1.getCourseModules);
// Create a new module in a course
router.post("/:courseId/modules", (0, auth_1.authorize)("instructor", "admin"), upload.fields([
    { name: "thumbnail", maxCount: 1 },
    { name: "video", maxCount: 1 },
]), moduleController_1.createModule);
// ✅ FIXED: Added :courseId prefix to match frontend
// Update a specific module
router.put("/:courseId/modules/:moduleId", (0, auth_1.authorize)("instructor", "admin"), upload.fields([
    { name: "thumbnail", maxCount: 1 },
    { name: "video", maxCount: 1 },
]), moduleController_1.updateModule);
// ✅ FIXED: Added :courseId prefix to match frontend
// Delete a specific module (and its lessons)
router.delete("/:courseId/modules/:moduleId", (0, auth_1.authorize)("instructor", "admin"), moduleController_1.deleteModule);
// =============================================
// LESSON ROUTES (Nested under :courseId/modules/:moduleId)
// =============================================
// ✅ FIXED: Added :courseId prefix to match frontend
// Create a lesson inside a specific module
router.post("/:courseId/modules/:moduleId/lessons", (0, auth_1.authorize)("instructor", "admin"), upload.fields([
    { name: "thumbnail", maxCount: 1 },
    { name: "video", maxCount: 1 },
]), lessonController_1.createLesson);
router.get("/:courseId/modules/available-exams", (0, auth_1.authorize)("instructor", "admin"), lessonController_1.getAvailableExams);
// Create a lesson inside a specific module (UPDATED)
router.post("/:courseId/modules/:moduleId/lessons", (0, auth_1.authorize)("instructor", "admin"), upload.fields([
    { name: "thumbnail", maxCount: 1 },
    { name: "video", maxCount: 1 },
]), lessonController_1.createLesson);
// ✅ NEW: Update a lesson
router.put("/:courseId/modules/:moduleId/lessons/:lessonId", (0, auth_1.authorize)("instructor", "admin"), upload.fields([
    { name: "thumbnail", maxCount: 1 },
    { name: "video", maxCount: 1 },
]), lessonController_1.updateLesson);
// Delete a specific lesson
router.delete("/:courseId/modules/:moduleId/lessons/:lessonId", (0, auth_1.authorize)("instructor", "admin"), moduleController_1.deleteLesson);
// Delete a specific lesson
router.delete("/:courseId/modules/:moduleId/lessons/:lessonId", (0, auth_1.authorize)("instructor", "admin"), moduleController_1.deleteLesson);
exports.default = router;
