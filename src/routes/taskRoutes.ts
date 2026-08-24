import { Router } from "express";
import { authenticate } from "../middleware/auth";
import * as taskController from "../controllers/taskController";

const router = Router();

router.use(authenticate); // Protect all task routes

router.post("/", taskController.createTask); // Admin
router.get("/", taskController.getTasks); // Admin gets all, Student gets own
router.get("/stats", taskController.getTaskStats);
router.put("/:id", taskController.updateTask); // Admin
router.delete("/:id", taskController.deleteTask); // Admin

router.post("/:id/submit", taskController.submitTask); // Student
router.post("/:id/review", taskController.reviewSubmission); // Admin

export default router;
