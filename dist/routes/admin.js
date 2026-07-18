"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// src/routes/admin.ts
const express_1 = require("express");
const adminController_1 = require("../controllers/adminController");
const auth_1 = require("../middleware/auth");
const roleAuth_1 = require("../middleware/roleAuth");
const router = (0, express_1.Router)();
router.use(auth_1.protect);
// Admin Protected Routes
router.get("/dashboard/stats", (0, roleAuth_1.authorize)("admin"), adminController_1.getUserStats);
router.get("/users", (0, roleAuth_1.authorize)("admin"), adminController_1.getUsers);
router.get("/recent-courses", (0, roleAuth_1.authorize)("admin"), adminController_1.getRecentCourses);
router.get("/courses", (0, roleAuth_1.authorize)("admin"), adminController_1.getRecentCourses); // Alias for frontend requests
exports.default = router;
