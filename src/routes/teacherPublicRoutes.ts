import { Router } from "express";
import {
  listPublicTeachers,
  getPublicTeacherBySlug,
  getPublicTeacherCourses,
} from "../controllers/teacherController";

const router = Router();

router.get("/", listPublicTeachers);
router.get("/:slug", getPublicTeacherBySlug);
router.get("/:slug/courses", getPublicTeacherCourses);

export default router;