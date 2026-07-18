// src/routes/orderRoutes.ts
import { Router } from "express";
import * as orderController from "../controllers/orderController";

const router = Router();

// Create order → returns payment URL or demo confirmation
router.post("/create", orderController.createOrder);

// Verify payment after gateway redirect (called by frontend)
router.post("/verify", orderController.verifyOrder);

// SSLCommerz IPN (called by SSLCommerz server-to-server)
// router.post("/ipn", orderController.handleIPN);

// Get single order by orderId or tranId
router.get("/:id", orderController.getOrder);

// Get all orders for a user
router.get("/user/:userId", orderController.getUserOrders);

export default router;
