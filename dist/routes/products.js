"use strict";
// src/routes/products.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const ProductController_1 = require("../controllers/ProductController");
const auth_1 = require("../middleware/auth");
const multer_1 = __importDefault(require("multer"));
const storage = multer_1.default.memoryStorage();
const upload = (0, multer_1.default)({
    storage,
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB for product images
});
const router = express_1.default.Router();
// --- PUBLIC ROUTES ---
router.get("/", ProductController_1.getAllProducts);
router.get("/:id", ProductController_1.getProductById);
// --- PROTECTED ROUTES ---
router.use(auth_1.protect);
router.post("/", (0, auth_1.authorize)("admin"), upload.single("image"), ProductController_1.createProduct);
router.put("/:id", (0, auth_1.authorize)("admin"), upload.single("image"), ProductController_1.updateProduct);
router.delete("/:id", (0, auth_1.authorize)("admin"), ProductController_1.deleteProduct);
exports.default = router;
