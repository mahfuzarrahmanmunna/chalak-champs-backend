"use strict";
// src/routes/productOrderRoutes.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const ProductOrderController_1 = require("../controllers/ProductOrderController");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
// ═══════════════════════════════════════════════════
// PUBLIC ROUTES (No auth required)
// Called from the OrderModal component
// ═══════════════════════════════════════════════════
router.post("/", ProductOrderController_1.createOrder);
// ═══════════════════════════════════════════════════
// PROTECTED ROUTES (Auth required)
// ═══════════════════════════════════════════════════
router.use(auth_1.protect);
// Stats endpoint (for admin dashboard)
router.get("/stats", (0, auth_1.authorize)("admin"), ProductOrderController_1.getOrderStats);
// Get all orders with filters
router.get("/", (0, auth_1.authorize)("admin", "manager"), ProductOrderController_1.getAllOrders);
// Quick status update (single field)
router.patch("/:id/status", (0, auth_1.authorize)("admin", "manager"), ProductOrderController_1.updateOrderStatus);
// Get single order
router.get("/:id", (0, auth_1.authorize)("admin", "manager"), ProductOrderController_1.getOrderById);
// Full order update
router.patch("/:id", (0, auth_1.authorize)("admin"), ProductOrderController_1.updateOrder);
// Delete order (soft or hard)
router.delete("/:id", (0, auth_1.authorize)("admin"), ProductOrderController_1.deleteOrder);
exports.default = router;
