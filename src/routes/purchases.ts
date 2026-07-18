import express from "express";
import {
  createPurchase,
  getAllPurchases,
  getPurchaseById,
  getPurchasesByPhone,
  getPurchasesByCourse,
  updatePurchaseStatus,
  cancelPurchase,
  getPurchaseStats,
  getRecentPurchases,
  exportPurchases,
} from "../controllers/purchaseController";
import { protect, authorize } from "../middleware/auth";

const router = express.Router();

// =============================================
// PUBLIC ROUTES (No auth required)
// =============================================

// Create purchase (student enrollment)
router.post("/", createPurchase);

// Get purchases by phone (student can check their purchases)
router.get("/phone/:phone", getPurchasesByPhone);

// Cancel purchase (student - with phone verification)
router.patch("/:id/cancel", cancelPurchase);

// Get single purchase by ID or purchaseId (public - limited info)
// This is useful for payment callbacks
router.get("/:id", getPurchaseById);

// =============================================
// PROTECTED ROUTES (Auth required)
// =============================================
router.use(protect);

// Get all purchases (admin/instructor)
router.get("/", getAllPurchases);

// Get purchase stats (admin/instructor)
router.get("/stats/overview", getPurchaseStats);

// Get recent purchases for dashboard (admin/instructor)
router.get("/stats/recent", getRecentPurchases);

// Export purchases (admin/instructor)
router.get("/export", exportPurchases);

// Get purchases by course (admin/instructor)
router.get("/course/:courseId", getPurchasesByCourse);

// Update purchase status (admin/instructor)
router.patch(
  "/:id/status",
  authorize("admin", "instructor"),
  updatePurchaseStatus
);

export default router;