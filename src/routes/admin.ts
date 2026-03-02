import express from "express";
import {
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
  bulkDeleteUsers,
  createUserByAdmin,
  getUserStats,
} from "../controllers/adminController";
import { validateUser } from "../middleware/validation";
import { requireAdmin } from "../middleware/roleAuth";
import { authenticateToken } from "../middleware/auth";
// import { authenticateToken, requireAdmin } from "../middleware/auth";
// import { validateUser } from "../middleware/validation";

const router = express.Router();

// All admin routes require authentication and admin role
router.use(authenticateToken);
router.use(requireAdmin);

// User management routes
router.get("/users", getUsers);
router.get("/users/:id", getUserById);
router.post("/users", validateUser, createUserByAdmin);
router.put("/users/:id", validateUser, updateUser);
router.delete("/users/:id", deleteUser);
router.delete("/users/bulk", bulkDeleteUsers);

// Statistics route
router.get("/stats", getUserStats);

export default router;
