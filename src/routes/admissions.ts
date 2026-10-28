import { Router } from "express";
import {
  createAdmission,
  getAdmissionDashboard,
  getAdmissions,
} from "../controllers/admissionController";
import { authorize, protect } from "../middleware/auth";

const router = Router();

router.use(protect, authorize("admin"));
router.get("/dashboard", getAdmissionDashboard);
router.get("/", getAdmissions);
router.post("/", createAdmission);

export default router;
