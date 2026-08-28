import { Router } from "express";
import { authenticate } from "../middleware/auth";
import * as manualPaymentController from "../controllers/manualPaymentController";

const router = Router();

// User route (requires login)
router.post("/create", authenticate, manualPaymentController.submitManualPayment);

// Admin routes (require login - you should add an isAdmin middleware here if you have one)
router.get("/", authenticate, manualPaymentController.getManualPayments);
router.put("/:id/approve", authenticate, manualPaymentController.approveManualPayment);
router.put("/:id/reject", authenticate, manualPaymentController.rejectManualPayment);

export default router;