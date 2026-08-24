import express from "express";
import {
  createProduct,
  getAllProducts,
  getProductById,
  getProductBySlug, // ✅ Import the new controller
  updateProduct,
  deleteProduct,
} from "../controllers/ProductController";
import { protect, authorize } from "../middleware/auth";
import { uploadSingleImage } from "../middleware/upload";

const router = express.Router();

// --- PUBLIC ROUTES ---
router.get("/", getAllProducts);
router.get("/slug/:slug", getProductBySlug); // ✅ Add slug route
router.get("/:id", getProductById);

// --- PROTECTED ROUTES ---
router.use(protect);

router.post(
  "/",
  (req, res, next) => {
    console.log("🔥 ROUTE HIT");
    next();
  },
  authorize("admin"),
  uploadSingleImage("image"),
  createProduct,
);


router.put(
  "/:id",
  authorize("admin"),
  uploadSingleImage("image"),
  updateProduct,
);
router.delete("/:id", authorize("admin"), deleteProduct);

export default router;
