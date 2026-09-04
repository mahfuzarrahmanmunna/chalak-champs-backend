import express from "express";
import {
  submitContactForm,
  getContactInquiries,
} from "../controllers/contactController";
import { protect,  } from "../middleware/auth"; // Adjust path based on your project structure

const router = express.Router();

// Public Route: POST /api/contact
router.route("/").post(submitContactForm);

// Private/Admin Route: GET /api/contact
router.route("/").get(protect, getContactInquiries);

export default router;
