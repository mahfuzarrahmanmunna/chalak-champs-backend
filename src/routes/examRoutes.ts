import express from "express";
import { protect, authorize } from "../middleware/auth";
import multer from "multer";
import {
  getExams,
  createExam,
  startExam,
  submitExam,
  logProctorEvent,
  gradeSubmission,
  getAllSubmissions,
} from "../controllers/ExamController";

const router = express.Router();

const storage = multer.memoryStorage();
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

router.use(protect);

// Create Exam (Admin/Instructor)
router.get("/", authorize("admin", "instructor"), getExams);
router.post(
  "/",
  authorize("admin", "instructor"),
  upload.single("thumbnail"),
  createExam,
);

// Start Exam (Student)
router.post("/start/:examId", startExam);

// Log Proctoring Event
router.post("/log-proctor", logProctorEvent);

// Submit Exam
router.post("/submit", submitExam);
router.post("/:submissionId/grade", protect, gradeSubmission); // Update score/feedback
router.get("/submissions", getAllSubmissions); // List pending reviews


export default router;
