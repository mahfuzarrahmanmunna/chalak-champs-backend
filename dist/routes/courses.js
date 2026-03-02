"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/routes/courses.ts
const express_1 = __importDefault(require("express"));
const CourseController_1 = require("../controllers/CourseController");
const auth_1 = require("../middleware/auth");
const upload_1 = require("../middleware/upload");
const validation_1 = require("../middleware/validation");
const router = express_1.default.Router();
// Public routes
router.get("/", CourseController_1.getCourses);
router.get("/:id", CourseController_1.getCourseById);
// Protected routes
router.use(auth_1.protect); // All routes below this require authentication
// Instructor routes
router.post("/", (0, auth_1.authorize)("instructor", "admin"), upload_1.uploadCourseFiles, validation_1.validateCourse, CourseController_1.createCourse);
router.get("/instructor/my-courses", (0, auth_1.authorize)("instructor", "admin"), CourseController_1.getCoursesByInstructor);
router.put("/:id", (0, auth_1.authorize)("instructor", "admin"), upload_1.uploadCourseFiles, CourseController_1.updateCourse);
router.delete("/:id", (0, auth_1.authorize)("instructor", "admin"), CourseController_1.deleteCourse);
router.patch("/:id/publish", (0, auth_1.authorize)("instructor", "admin"), CourseController_1.publishCourse);
router.patch("/:id/unpublish", (0, auth_1.authorize)("instructor", "admin"), CourseController_1.unpublishCourse);
exports.default = router;
