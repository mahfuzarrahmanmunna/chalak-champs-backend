"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// src/routes/admin.ts
const express_1 = require("express");
const adminController_1 = require("../controllers/adminController");
const roleAuth_1 = require("../middleware/roleAuth"); // Import fixed
const router = (0, express_1.Router)();
// Admin Protected Routes
// Note: authorize("admin") works with the updated middleware above
router.get("/users", (0, roleAuth_1.authorize)("admin"), adminController_1.getUserStats);
router.get("/recent-courses", (0, roleAuth_1.authorize)("admin"), adminController_1.getRecentCourses);
exports.default = router;
