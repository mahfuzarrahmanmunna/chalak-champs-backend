import { Router } from "express";
import {
  listTeachers,
  listTeachersForSelect,  // ✅ ADDED
  getTeacherById,
  getTeacherByUser,
  createTeacher,
  updateTeacher,
  updateTeacherStatus,
  deleteTeacher,
  uploadTeacherPhoto,
} from "../controllers/teacherController";
import { protect } from "../middleware/auth";
import { authorize } from "../middleware/roleAuth";

const router = Router();

// All admin routes require authentication + admin role
router.use(protect);
router.use(authorize("admin"));

// ═══════════════════════════════════════════════════════════════
//  IMPORTANT: Static routes MUST come before /:id
//  Otherwise Express treats "for-course-select", "upload-photo",
//  and "by-user" as a teacher profile ID parameter → 400 error
// ═══════════════════════════════════════════════════════════════

router.get("/for-course-select", listTeachersForSelect);   
router.post("/upload-photo", uploadTeacherPhoto);           
router.get("/by-user/:userId", getTeacherByUser);     

// Root routes
router.get("/", listTeachers);
router.post("/", createTeacher);

// Dynamic routes — MUST come last (catches /:id)
router.get("/:id", getTeacherById);
router.put("/:id", updateTeacher);
router.patch("/:id/status", updateTeacherStatus);
router.delete("/:id", deleteTeacher);

export default router;