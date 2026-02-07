// routes/auth.ts
import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { authenticateForRegistration } from "../middleware/authForRegistration";
import {
  sendPhoneVerification,
  verifyPhoneCode,
  sendEmailVerification,
  verifyEmailCode,
  register,
  getProfile,
  verifyToken,
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

// Registration route - use special middleware
router.post("/register", authenticateForRegistration, register);

// Protected routes (require existing user)
router.use(authenticate);
router.get("/profile", getProfile);
router.get("/verify", verifyToken);

export default router;
