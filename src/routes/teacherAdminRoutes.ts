import { Router } from "express";
import {
  getTeacherByUser,
  createTeacher,
  updateTeacher,
  updateTeacherStatus,
  deleteTeacher,
   listTeachers,
  getTeacherById,
   uploadTeacherPhoto,
} from "../controllers/teacherController";
import { protect } from "../middleware/auth";
import { authorize } from "../middleware/roleAuth";

const router = Router();

// All admin routes require authentication + admin role
router.use(protect);
router.use(authorize("admin"));

// Order matters: /by-user/:userId BEFORE /:id
router.get("/by-user/:userId", getTeacherByUser);
router.get("/", listTeachers);
router.post("/", createTeacher);
router.get("/:id", getTeacherById);
router.put("/:id", updateTeacher);
router.patch("/:id/status", updateTeacherStatus);
router.delete("/:id", deleteTeacher);

router.post("/upload-photo", uploadTeacherPhoto);




export default router;