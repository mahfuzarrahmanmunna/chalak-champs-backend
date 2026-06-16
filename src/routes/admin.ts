// src/routes/admin.ts
import { Router } from "express";
import {
  getUsers,
  getUserStats,
  getRecentCourses,
} from "../controllers/adminController";
import { protect } from "../middleware/auth";
import { authorize } from "../middleware/roleAuth";

const router = Router();

router.use(protect);

// Admin Protected Routes
router.get("/dashboard/stats", authorize("admin"), getUserStats);
router.get("/users", authorize("admin"), getUsers);
router.get("/recent-courses", authorize("admin"), getRecentCourses);
router.get("/courses", authorize("admin"), getRecentCourses); // Alias for frontend requests

export default router;
