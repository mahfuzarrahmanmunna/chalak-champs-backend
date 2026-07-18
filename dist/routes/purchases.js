"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const purchaseController_1 = require("../controllers/purchaseController");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
// =============================================
// PUBLIC ROUTES (No auth required)
// =============================================
// Create purchase (student enrollment)
router.post("/", purchaseController_1.createPurchase);
// Get purchases by phone (student can check their purchases)
router.get("/phone/:phone", purchaseController_1.getPurchasesByPhone);
// Cancel purchase (student - with phone verification)
router.patch("/:id/cancel", purchaseController_1.cancelPurchase);
// Get single purchase by ID or purchaseId (public - limited info)
// This is useful for payment callbacks
router.get("/:id", purchaseController_1.getPurchaseById);
// =============================================
// PROTECTED ROUTES (Auth required)
// =============================================
router.use(auth_1.protect);
// Get all purchases (admin/instructor)
router.get("/", purchaseController_1.getAllPurchases);
// Get purchase stats (admin/instructor)
router.get("/stats/overview", purchaseController_1.getPurchaseStats);
// Get recent purchases for dashboard (admin/instructor)
router.get("/stats/recent", purchaseController_1.getRecentPurchases);
// Export purchases (admin/instructor)
router.get("/export", purchaseController_1.exportPurchases);
// Get purchases by course (admin/instructor)
router.get("/course/:courseId", purchaseController_1.getPurchasesByCourse);
// Update purchase status (admin/instructor)
router.patch("/:id/status", (0, auth_1.authorize)("admin", "instructor"), purchaseController_1.updatePurchaseStatus);
exports.default = router;
