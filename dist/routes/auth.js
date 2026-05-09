"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const authController = __importStar(require("../controllers/authController"));
const router = (0, express_1.Router)();
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
router.post("/register", auth_1.authenticate, authController.register);
// 7. Get Current User Profile
router.get("/profile", auth_1.authenticate, authController.getProfile);
// 8. Verify Token Status
router.post("/verify", auth_1.authenticate, authController.verifyToken);
// 9. Get All Users (Admin/Protected)
router.get("/users", auth_1.authenticate, authController.getAllUsers);
// 10. Get User By ID
router.get("/users/:id", auth_1.authenticate, authController.getUserById);
exports.default = router;
