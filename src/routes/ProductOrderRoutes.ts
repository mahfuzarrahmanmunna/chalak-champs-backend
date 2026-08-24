// src/routes/productOrderRoutes.ts

import express from "express";
import {
  createOrder,
  getAllOrders,
  getOrderById,
  updateOrder,
  deleteOrder,
  getOrderStats,
  updateOrderStatus,
} from "../controllers/ProductOrderController";
import { protect, authorize } from "../middleware/auth";

const router = express.Router();

// ═══════════════════════════════════════════════════
// PUBLIC ROUTES (No auth required)
// Called from the OrderModal component
// ═══════════════════════════════════════════════════
router.post("/", createOrder);

// ═══════════════════════════════════════════════════
// PROTECTED ROUTES (Auth required)
// ═══════════════════════════════════════════════════
router.use(protect);

// Stats endpoint (for admin dashboard)
router.get("/stats", authorize("admin"), getOrderStats);

// Get all orders with filters
router.get("/", authorize("admin", "manager"), getAllOrders);

// Quick status update (single field)
router.patch("/:id/status", authorize("admin", "manager"), updateOrderStatus);

// Get single order
router.get("/:id", authorize("admin", "manager"), getOrderById);

// Full order update
router.patch("/:id", authorize("admin"), updateOrder);

// Delete order (soft or hard)
router.delete("/:id", authorize("admin"), deleteOrder);

export default router;
