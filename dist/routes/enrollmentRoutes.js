"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const enrollmentController_1 = require("../controllers/enrollmentController");
const router = (0, express_1.Router)();
// User Routes
router.post("/check", auth_1.authenticate, enrollmentController_1.checkEnrollment);
router.get("/my-enrollments", auth_1.authenticate, enrollmentController_1.getUserEnrollments);
router.post("/check-multiple", auth_1.authenticate, enrollmentController_1.checkMultipleEnrollments);
// Admin Routes
router.get("/all", auth_1.authenticate, (0, auth_1.authorize)("admin", "superadmin"), enrollmentController_1.getAllEnrollments);
router.delete("/:id", auth_1.authenticate, (0, auth_1.authorize)("admin", "superadmin"), enrollmentController_1.deleteEnrollment);
router.patch("/:id/status", auth_1.authenticate, (0, auth_1.authorize)("admin", "superadmin"), enrollmentController_1.updateEnrollmentStatus);
exports.default = router;
