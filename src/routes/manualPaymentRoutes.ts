import { Router } from "express";
import { authenticate } from "../middleware/auth";
import {
  submitManualPayment,
  getManualPayments,
  approveManualPayment,
  rejectManualPayment,
} from "../controllers/manualPaymentController";

const router = Router();

// User route
router.post("/create", authenticate, submitManualPayment);

// Admin routes
router.get("/", authenticate, getManualPayments);
router.put("/:id/approve", authenticate, approveManualPayment);
router.put("/:id/reject", authenticate, rejectManualPayment);

export default router;
