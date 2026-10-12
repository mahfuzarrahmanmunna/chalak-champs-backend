"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const manualPaymentController_1 = require("../controllers/manualPaymentController");
const router = (0, express_1.Router)();
// User route
router.post("/create", auth_1.authenticate, manualPaymentController_1.submitManualPayment);
// Admin routes
router.get("/", auth_1.authenticate, manualPaymentController_1.getManualPayments);
router.put("/:id/approve", auth_1.authenticate, manualPaymentController_1.approveManualPayment);
router.put("/:id/reject", auth_1.authenticate, manualPaymentController_1.rejectManualPayment);
exports.default = router;
