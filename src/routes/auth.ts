// src/routes/auth.ts

import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { authenticateForRegistration } from "../middleware/authForRegistration";
import { requireAdmin } from "../middleware/roleAuth";
import {
  sendPhoneVerification,
  verifyPhoneCode,
  sendEmailVerification,
  verifyEmailCode,
  register,
  getProfile,
  verifyToken,
  login,
  getAllUsers,
  getUserById,
} from "../controllers/authController";

const router = Router();

// Health check endpoint
router.get("/health", (req, res) => {
  res.status(200).json({ status: "ok", message: "Server is running" });
});

// Public routes
router.post("/send-phone-verification", sendPhoneVerification);
router.post("/verify-phone-code", verifyPhoneCode);
router.post("/send-email-verification", sendEmailVerification);
router.post("/verify-email-code", verifyEmailCode);

// Authentication routes
router.post("/login", login);
router.post("/verify", verifyToken); // Add this line for POST /verify

// Registration route - use special middleware
router.post("/register", authenticateForRegistration, register);

// Protected routes (require existing user)
router.use(authenticate);
router.get("/profile", getProfile);
router.get("/verify", verifyToken); // Keep the GET version for backward compatibility

// Admin routes
router.get("/users", requireAdmin, getAllUsers);
router.get("/users/:id", getUserById);

export default router;
