"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/routes/progressRoutes.ts
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth"); // Make sure this path matches your project structure
const progressController_1 = require("../controllers/progressController"); // Make sure this path matches your project structure
const router = express_1.default.Router();
// GET & PATCH /api/courses/:courseId/progress
router
    .route("/:courseId/progress")
    .get(auth_1.protect, progressController_1.getCourseProgress)
    .patch(auth_1.protect, progressController_1.updateLastAccessedLesson);
// POST /api/courses/:courseId/modules/:moduleId/lessons/:lessonId/complete
router
    .route("/:courseId/modules/:moduleId/lessons/:lessonId/complete")
    .post(auth_1.protect, progressController_1.markLessonComplete);
exports.default = router;
