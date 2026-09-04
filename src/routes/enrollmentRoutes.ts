import { Router } from "express";
import { authenticate } from "../middleware/auth";
import {
  checkEnrollment,
  getUserEnrollments,
  checkMultipleEnrollments,
} from "../controllers/enrollmentController";

const router = Router();

router.post("/check", authenticate, checkEnrollment);
router.get("/my-enrollments", authenticate, getUserEnrollments);
router.post("/check-multiple", authenticate, checkMultipleEnrollments);

export default router;
