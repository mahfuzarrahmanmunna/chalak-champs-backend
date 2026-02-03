import { Router } from "express";
import { authenticate } from "../middleware/auth";
import {
  sendPhoneVerification,
  verifyPhoneCode,
  register,
  getProfile,
  verifyToken,
} from "../controllers/authController";

const router = Router();

// Public routes
router.post("/send-phone-verification", sendPhoneVerification);
router.post("/verify-phone-code", verifyPhoneCode);

// Protected routes
router.use(authenticate);
router.post("/register", register);
router.get("/profile", getProfile);
router.get("/verify", verifyToken);

export default router;
