import { Router } from "express";
import { authenticate } from "../middleware/auth";
import * as authController from "../controllers/authController";

const router = Router();

// ================= PUBLIC ROUTES ==================

// 1. Send Phone Verification Code
router.post("/send-phone-verification", authController.sendPhoneVerification);

// 2. Verify Phone Code
router.post("/verify-phone-code", authController.verifyPhoneCode);

// 3. Send Email Verification Code
router.post("/send-email-verification", authController.sendEmailVerification);

// 4. Verify Email Code
router.post("/verify-email-code", authController.verifyEmailCode);

// 5. Login
router.post("/login", authController.login);

// ================= PROTECTED ROUTES ==================
// Note: We apply the 'authenticate' middleware here because the controller
// functions (like 'register' and 'getProfile') expect 'req.user' to be populated.

// 6. Register User
router.post("/register", authenticate, authController.register);

// 7. Get Current User Profile
router.get("/profile", authenticate, authController.getProfile);

// 8. Verify Token Status
router.post("/verify", authenticate, authController.verifyToken);

// 9. Get All Users (Admin/Protected)
router.get("/users", authenticate, authController.getAllUsers);

// 10. Get User By ID
router.get("/users/:id", authenticate, authController.getUserById);

export default router;
