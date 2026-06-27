import { Router } from "express";
import * as ctaController from "../controllers/ctaController";

const router = Router();

// --- PUBLIC ROUTE ---

// Create a new CTA Submission (Public Form)
router.post("/", ctaController.createBooking);

// --- ADMIN ROUTES (Optional: To view/delete leads) ---
// Note: You might want to add 'protect' and 'authorize' middleware here for security.

// Get all CTA Submissions
router.get("/", ctaController.getAllBookings);

// Delete a CTA Submission
router.delete("/:id", ctaController.deleteBooking);

export default router;
