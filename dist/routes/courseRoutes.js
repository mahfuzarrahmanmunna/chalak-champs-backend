"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const CourseController_1 = require("../controllers/CourseController");
const CurriculumController_1 = require("../controllers/CurriculumController");
const BatchController_1 = require("../controllers/BatchController");
const auth_1 = require("../middleware/auth");
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
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
    limits: { fileSize: 500 * 1024 * 1024 },
});
const router = express_1.default.Router();
// --- PUBLIC ROUTES ---
router.get("/", CourseController_1.getCourses);
router.get("/:id", CourseController_1.getCourseById);
// --- PROTECTED ROUTES ---
router.use(auth_1.protect);
// 1. Course Level
router.get("/instructor/my-courses", CourseController_1.getInstructorCourses);
router.post("/", (0, auth_1.authorize)("instructor", "admin"), upload.fields([
    { name: "thumbnail", maxCount: 1 },
    { name: "video", maxCount: 1 },
]), CourseController_1.createCourse);
router.put("/:id", (0, auth_1.authorize)("instructor", "admin"), upload.fields([
    { name: "thumbnail", maxCount: 1 },
    { name: "video", maxCount: 1 },
]), CourseController_1.updateCourse);
router.delete("/:id", (0, auth_1.authorize)("instructor", "admin"), CourseController_1.deleteCourse);
// 2. Curriculum Level
router.get("/:courseId/curriculum", CurriculumController_1.getCourseStructure);
// Modules
router.post("/:courseId/modules", (0, auth_1.authorize)("instructor", "admin"), CurriculumController_1.createModule);
router.put("/modules/:id", (0, auth_1.authorize)("instructor", "admin"), CurriculumController_1.updateModule);
router.delete("/modules/:id", (0, auth_1.authorize)("instructor", "admin"), CurriculumController_1.deleteModule);
// Lessons
router.post("/modules/:moduleId/lessons", (0, auth_1.authorize)("instructor", "admin"), CurriculumController_1.createLesson);
router.get("/lessons/:id", CurriculumController_1.getLessonById); // View specific lesson
router.put("/lessons/:id", (0, auth_1.authorize)("instructor", "admin"), CurriculumController_1.updateLesson);
router.delete("/lessons/:id", (0, auth_1.authorize)("instructor", "admin"), CurriculumController_1.deleteLesson);
// 3. Batch Level
router.post("/:courseId/batches", (0, auth_1.authorize)("instructor", "admin"), BatchController_1.createBatch);
router.get("/:courseId/batches", BatchController_1.getBatchesByCourse);
router.post("/batches/:batchId/enroll", BatchController_1.enrollInBatch);
exports.default = router;
