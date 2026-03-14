// src/routes/admin.ts
import express from "express";
import {
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
  bulkDeleteUsers,
  createUserByAdmin,
  getUserStats,
  getRecentCourses, // <--- Import the new controller
} from "../controllers/adminController";
import { validateUser } from "../middleware/validation";
import { authenticateToken, authorize } from "../middleware/auth";

const router = express.Router();

// Middleware
router.use(authenticateToken);
router.use(authorize("admin"));

// User Management Routes
router.get("/users", getUsers);
router.get("/users/:id", getUserById);
router.post("/users", validateUser, createUserByAdmin);
router.put("/users/:id", validateUser, updateUser);
router.delete("/users/:id", deleteUser);
router.delete("/users/bulk", bulkDeleteUsers);

// Dashboard / Stats Routes
// Frontend calls: /api/admin/dashboard/stats
router.get("/dashboard/stats", getUserStats);

// NEW: Route for recent courses
// Frontend calls: /api/admin/courses?limit=5
router.get("/courses", getRecentCourses);

export default router;
