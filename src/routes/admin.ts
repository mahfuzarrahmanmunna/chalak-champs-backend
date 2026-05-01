// src/routes/admin.ts
import { Router } from "express";
import { getUserStats, getRecentCourses } from "../controllers/adminController";
import { authorize } from "../middleware/roleAuth"; // Import fixed

const router = Router();

// Admin Protected Routes
// Note: authorize("admin") works with the updated middleware above
router.get("/users", authorize("admin"), getUserStats);
router.get("/recent-courses", authorize("admin"), getRecentCourses);

export default router;
