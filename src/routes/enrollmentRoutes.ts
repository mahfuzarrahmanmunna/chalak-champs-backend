import { Router } from "express";
import * as enrollmentController from "../controllers/enrollmentController";

const router = Router();

router.post("/", enrollmentController.createEnrollment);
router.get("/", enrollmentController.getAllEnrollments);
router.delete("/:id", enrollmentController.deleteEnrollment);

export default router;
