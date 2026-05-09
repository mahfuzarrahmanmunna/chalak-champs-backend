"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/routes/courses.ts
const express_1 = __importDefault(require("express"));
const CourseController_1 = require("../controllers/CourseController");
const auth_1 = require("../middleware/auth");
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const moduleRoutes_1 = __importDefault(require("./moduleRoutes"));
// Multer Config
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        if (file.fieldname === "thumbnail")
            cb(null, "uploads/images/");
        else if (file.fieldname === "video")
            cb(null, "uploads/videos/");
        else
            cb(null, "uploads/misc/");
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        cb(null, file.fieldname + "-" + uniqueSuffix + path_1.default.extname(file.originalname));
    },
});
const upload = (0, multer_1.default)({
    storage: storage,
    limits: { fileSize: 500 * 1024 * 1024 }, // 500MB
});
const router = express_1.default.Router();
// Public Routes
router.get("/", CourseController_1.getCourses);
router.get("/:id", CourseController_1.getCourseById);
router.use("/:courseId/modules", moduleRoutes_1.default);
// --- PROTECTED ROUTES ---
router.use(auth_1.protect); // All routes below this line require authentication
router.get("/instructor/my-courses", CourseController_1.getInstructorCourses);
// Create Course
router.post("/", (0, auth_1.authorize)("instructor", "admin"), // Requires specific role
upload.fields([
    { name: "thumbnail", maxCount: 1 },
    { name: "video", maxCount: 1 },
]), CourseController_1.createCourse);
// Update Course
router.put("/:id", (0, auth_1.authorize)("instructor", "admin"), upload.fields([
    { name: "thumbnail", maxCount: 1 },
    { name: "video", maxCount: 1 },
]), CourseController_1.updateCourse);
// Delete Course
router.delete("/:id", (0, auth_1.authorize)("instructor", "admin"), CourseController_1.deleteCourse);
exports.default = router;
