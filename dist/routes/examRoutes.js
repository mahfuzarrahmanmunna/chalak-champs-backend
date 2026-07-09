"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/routes/examRoutes.ts
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const multer_1 = __importDefault(require("multer"));
const ExamController_1 = require("../controllers/ExamController");
const router = express_1.default.Router();
const storage = multer_1.default.memoryStorage();
const upload = (0, multer_1.default)({ storage, limits: { fileSize: 10 * 1024 * 1024 } });
router.use(auth_1.protect);
// Create Exam (Admin/Instructor)
router.get("/", (0, auth_1.authorize)("admin", "instructor"), ExamController_1.getExams);
router.post("/", (0, auth_1.authorize)("admin", "instructor"), upload.single("thumbnail"), ExamController_1.createExam);
// Start Exam (Student)
router.post("/start/:examId", ExamController_1.startExam);
// Log Proctoring Event
router.post("/log-proctor", ExamController_1.logProctorEvent);
// Submit Exam
router.post("/submit", ExamController_1.submitExam);
router.post("/:submissionId/grade", auth_1.protect, ExamController_1.gradeSubmission); // Update score/feedback
router.get("/submissions", ExamController_1.getAllSubmissions); // List pending reviews
exports.default = router;
