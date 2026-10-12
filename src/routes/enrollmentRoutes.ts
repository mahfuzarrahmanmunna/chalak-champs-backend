import { Router } from "express";
import { authenticate, authorize } from "../middleware/auth";
import {
  checkEnrollment,
  getUserEnrollments,
  checkMultipleEnrollments,
  getAllEnrollments,
  deleteEnrollment,
  updateEnrollmentStatus,
} from "../controllers/enrollmentController";

const router = Router();

// User Routes
router.post("/check", authenticate, checkEnrollment);
router.get("/my-enrollments", authenticate, getUserEnrollments);
router.post("/check-multiple", authenticate, checkMultipleEnrollments);

// Admin Routes
router.get("/all", authenticate, authorize("admin", "superadmin"), getAllEnrollments);
router.delete("/:id", authenticate, authorize("admin", "superadmin"), deleteEnrollment);
router.patch("/:id/status", authenticate, authorize("admin", "superadmin"), updateEnrollmentStatus);

export default router;