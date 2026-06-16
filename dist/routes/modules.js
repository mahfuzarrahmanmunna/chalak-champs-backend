"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const multer_1 = __importDefault(require("multer"));
// Import the controller functions
const moduleController_1 = require("../controllers/moduleController");
const router = express_1.default.Router();
// Multer configuration for file uploads
// IMPORTANT: This is required to parse FormData sent from the frontend
const upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(), // Use memory storage (uploadToImgBB prefers Buffer)
    limits: { fileSize: 500 * 1024 * 1024 }, // 500MB
});
// --- MODULE ROUTES ---
// Get modules for a specific course
router.get("/:courseId", moduleController_1.getCourseModules);
// Create a new module
// FIX: Added upload.fields to handle FormData (Thumbnail + Video)
router.post("/:courseId", // Changed from "/" to "/:courseId" based on your error URL
auth_1.protect, (0, auth_1.authorize)("instructor", "admin"), upload.fields([
    { name: "thumbnail", maxCount: 1 },
    { name: "video", maxCount: 1 },
]), moduleController_1.createModule);
// Update a module
router.put("/:id", moduleController_1.updateModule);
// Delete a module
router.delete("/:id", moduleController_1.deleteModule);
// --- LESSON ROUTES (Nested inside Modules) ---
// Create a lesson inside a specific module
router.post("/:moduleId/lessons", auth_1.protect, (0, auth_1.authorize)("instructor", "admin"), upload.fields([
    { name: "thumbnail", maxCount: 1 },
    { name: "video", maxCount: 1 },
]), moduleController_1.createLesson);
exports.default = router;
