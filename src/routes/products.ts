// src/routes/products.ts

import express from "express";
import {
  createProduct,
  getAllProducts,
  getProductById,
  updateProduct,
  deleteProduct,
} from "../controllers/ProductController";
import { protect, authorize } from "../middleware/auth";
import multer from "multer";

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB for product images
});

const router = express.Router();

// --- PUBLIC ROUTES ---
router.get("/", getAllProducts);
router.get("/:id", getProductById);

// --- PROTECTED ROUTES ---
router.use(protect);

router.post("/", authorize("admin"), upload.single("image"), createProduct);

router.put("/:id", authorize("admin"), upload.single("image"), updateProduct);

router.delete("/:id", authorize("admin"), deleteProduct);

export default router;
