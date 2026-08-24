"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const ProductController_1 = require("../controllers/ProductController");
const auth_1 = require("../middleware/auth");
const upload_1 = require("../middleware/upload");
const router = express_1.default.Router();
// --- PUBLIC ROUTES ---
router.get("/", ProductController_1.getAllProducts);
router.get("/slug/:slug", ProductController_1.getProductBySlug); // ✅ Add slug route
router.get("/:id", ProductController_1.getProductById);
// --- PROTECTED ROUTES ---
router.use(auth_1.protect);
router.post("/", (req, res, next) => {
    console.log("🔥 ROUTE HIT");
    next();
}, (0, auth_1.authorize)("admin"), (0, upload_1.uploadSingleImage)("image"), ProductController_1.createProduct);
router.put("/:id", (0, auth_1.authorize)("admin"), (0, upload_1.uploadSingleImage)("image"), ProductController_1.updateProduct);
router.delete("/:id", (0, auth_1.authorize)("admin"), ProductController_1.deleteProduct);
exports.default = router;
