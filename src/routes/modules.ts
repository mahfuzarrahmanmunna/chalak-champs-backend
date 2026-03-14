import express from "express";
import {
  createModule,
  getModulesByCourse,
  updateModule,
  deleteModule,
} from "../controllers/moduleController";
import { protect, authorize } from "../middleware/auth";

const router = express.Router({ mergeParams: true }); // mergeParams to access :courseId from parent route

router.use(protect); // All routes require login

router
  .route("/")
  .post(authorize("instructor", "admin"), createModule)
  .get(getModulesByCourse); // Usually instructors need this too

router
  .route("/:id")
  .put(authorize("instructor", "admin"), updateModule)
  .delete(authorize("instructor", "admin"), deleteModule);

export default router;
