"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const CourseController_1 = require("../controllers/CourseController");
const auth_1 = require("../middleware/auth");
const multer_1 = __importDefault(require("multer"));
const moduleController_1 = require("../controllers/moduleController");
// Use memory storage to avoid filesystem operations (incompatible with Workers)
const storage = multer_1.default.memoryStorage();
const upload = (0, multer_1.default)({
    storage,
    limits: { fileSize: 500 * 1024 * 1024 }, // 500MB
});
const router = express_1.default.Router();
// --- PUBLIC ROUTES ---
router.get("/", CourseController_1.getAllCourses);
router.get("/:id", CourseController_1.getCourseById);
// --- PROTECTED ROUTES ---
router.use(auth_1.protect);
router.get("/instructor/my-courses", CourseController_1.getInstructorCourses);
// Create Course
router.post("/", (0, auth_1.authorize)("instructor", "admin"), upload.fields([
    { name: "thumbnail", maxCount: 1 },
    { name: "video", maxCount: 1 },
]), CourseController_1.createCourse);
// Update Course
router.put("/:id", (0, auth_1.authorize)("instructor", "admin"), upload.fields([
    { name: "thumbnail", maxCount: 1 },
    { name: "video", maxCount: 1 },
]), CourseController_1.updateCourse);
router.get("/:id/modules", moduleController_1.getCourseModules);
router.post("/:id/modules", moduleController_1.createModule);
router.post("/:id/modules/lessons", moduleController_1.createLesson);
router.delete("/lessons/:id", moduleController_1.deleteLesson);
// Delete Course
router.delete("/:id", (0, auth_1.authorize)("instructor", "admin"), CourseController_1.deleteCourse);
exports.default = router;
