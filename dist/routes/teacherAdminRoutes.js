"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const teacherController_1 = require("../controllers/teacherController");
const auth_1 = require("../middleware/auth");
const roleAuth_1 = require("../middleware/roleAuth");
const router = (0, express_1.Router)();
// All admin routes require authentication + admin role
router.use(auth_1.protect);
router.use((0, roleAuth_1.authorize)("admin"));
// ═══════════════════════════════════════════════════════════════
//  IMPORTANT: Static routes MUST come before /:id
//  Otherwise Express treats "for-course-select", "upload-photo",
//  and "by-user" as a teacher profile ID parameter → 400 error
// ═══════════════════════════════════════════════════════════════
router.get("/for-course-select", teacherController_1.listTeachersForSelect);
router.post("/upload-photo", teacherController_1.uploadTeacherPhoto);
router.get("/by-user/:userId", teacherController_1.getTeacherByUser);
// Root routes
router.get("/", teacherController_1.listTeachers);
router.post("/", teacherController_1.createTeacher);
// Dynamic routes — MUST come last (catches /:id)
router.get("/:id", teacherController_1.getTeacherById);
router.put("/:id", teacherController_1.updateTeacher);
router.patch("/:id/status", teacherController_1.updateTeacherStatus);
router.delete("/:id", teacherController_1.deleteTeacher);
exports.default = router;
