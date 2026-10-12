"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// src/routes/admin.ts
const express_1 = require("express");
const adminController_1 = require("../controllers/adminController");
const auth_1 = require("../middleware/auth");
const roleAuth_1 = require("../middleware/roleAuth");
const CourseController_1 = require("../controllers/CourseController");
const router = (0, express_1.Router)();
// Protect all routes below this line
router.use(auth_1.protect);
// ==========================================
// USER MANAGEMENT ROUTES
// ==========================================
// IMPORTANT: "/users/bulk" MUST come BEFORE "/users/:id"
// so Express doesn't mistake "bulk" for a user ID!
router.delete("/users/bulk", (0, roleAuth_1.authorize)("admin"), adminController_1.bulkDeleteUsers);
router.get("/users", (0, roleAuth_1.authorize)("admin"), adminController_1.getUsers);
router.get("/users/:id", (0, roleAuth_1.authorize)("admin"), adminController_1.getUserById);
router.post("/users", (0, roleAuth_1.authorize)("admin"), adminController_1.createUserByAdmin);
// ✅ THIS IS THE ROUTE THAT FIXES YOUR 404 ERROR
router.put("/users/:id", (0, roleAuth_1.authorize)("admin"), adminController_1.updateUser);
router.delete("/users/:id", (0, roleAuth_1.authorize)("admin"), adminController_1.deleteUser);
// Permission Routes
router.get("/users/:id/permissions", (0, roleAuth_1.authorize)("admin"), adminController_1.getUserPermissions);
router.put("/users/:id/permissions", (0, roleAuth_1.authorize)("admin"), adminController_1.updateUserPermissions);
// ==========================================
// DASHBOARD & COURSE ROUTES
// ==========================================
router.get("/dashboard/stats", (0, roleAuth_1.authorize)("admin"), adminController_1.getUserStats);
router.get("/recent-courses", (0, roleAuth_1.authorize)("admin"), adminController_1.getRecentCourses);
router.get("/courses", (0, roleAuth_1.authorize)("admin"), CourseController_1.getAdminCourses);
exports.default = router;
