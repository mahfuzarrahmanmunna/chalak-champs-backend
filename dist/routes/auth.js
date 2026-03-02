"use strict";
// src/routes/auth.ts
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const authForRegistration_1 = require("../middleware/authForRegistration");
const roleAuth_1 = require("../middleware/roleAuth");
const authController_1 = require("../controllers/authController");
const router = (0, express_1.Router)();
// Health check endpoint
router.get("/health", (req, res) => {
    res.status(200).json({ status: "ok", message: "Server is running" });
});
// Public routes
router.post("/send-phone-verification", authController_1.sendPhoneVerification);
router.post("/verify-phone-code", authController_1.verifyPhoneCode);
router.post("/send-email-verification", authController_1.sendEmailVerification);
router.post("/verify-email-code", authController_1.verifyEmailCode);
// Authentication routes
router.post("/login", authController_1.login);
router.post("/verify", authController_1.verifyToken); // Add this line for POST /verify
// Registration route - use special middleware
router.post("/register", authForRegistration_1.authenticateForRegistration, authController_1.register);
// Protected routes (require existing user)
router.use(auth_1.authenticate);
router.get("/profile", authController_1.getProfile);
router.get("/verify", authController_1.verifyToken); // Keep the GET version for backward compatibility
// Admin routes
router.get("/users", roleAuth_1.requireAdmin, authController_1.getAllUsers);
router.get("/users/:id", authController_1.getUserById);
exports.default = router;
