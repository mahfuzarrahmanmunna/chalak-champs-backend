// src/routes/admin.ts
import { Router } from "express";
import {
  getUsers,
  getUserStats,
  getRecentCourses,
  getUserById, // ✅ Added
  createUserByAdmin, // ✅ Added
  updateUser, // ✅ Added
  deleteUser, // ✅ Added
  bulkDeleteUsers, // ✅ Added
  getUserPermissions, // ✅ Added
  updateUserPermissions, // ✅ Added
} from "../controllers/adminController";
import { protect } from "../middleware/auth";
import { authorize } from "../middleware/roleAuth";
import { getAdminCourses } from "../controllers/CourseController";

const router = Router();

// Protect all routes below this line
router.use(protect);

// ==========================================
// USER MANAGEMENT ROUTES
// ==========================================

// IMPORTANT: "/users/bulk" MUST come BEFORE "/users/:id"
// so Express doesn't mistake "bulk" for a user ID!
router.delete("/users/bulk", authorize("admin"), bulkDeleteUsers);

router.get("/users", authorize("admin"), getUsers);
router.get("/users/:id", authorize("admin"), getUserById);
router.post("/users", authorize("admin"), createUserByAdmin);

// ✅ THIS IS THE ROUTE THAT FIXES YOUR 404 ERROR
router.put("/users/:id", authorize("admin"), updateUser);

router.delete("/users/:id", authorize("admin"), deleteUser);

// Permission Routes
router.get("/users/:id/permissions", authorize("admin"), getUserPermissions);
router.put("/users/:id/permissions", authorize("admin"), updateUserPermissions);

// ==========================================
// DASHBOARD & COURSE ROUTES
// ==========================================
router.get("/dashboard/stats", authorize("admin"), getUserStats);
router.get("/recent-courses", authorize("admin"), getRecentCourses);
router.get("/courses", authorize("admin"), getAdminCourses);

export default router;
