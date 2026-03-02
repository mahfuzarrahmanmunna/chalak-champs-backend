"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const adminController_1 = require("../controllers/adminController");
const validation_1 = require("../middleware/validation");
const roleAuth_1 = require("../middleware/roleAuth");
const auth_1 = require("../middleware/auth");
// import { authenticateToken, requireAdmin } from "../middleware/auth";
// import { validateUser } from "../middleware/validation";
const router = express_1.default.Router();
// All admin routes require authentication and admin role
router.use(auth_1.authenticateToken);
router.use(roleAuth_1.requireAdmin);
// User management routes
router.get("/users", adminController_1.getUsers);
router.get("/users/:id", adminController_1.getUserById);
router.post("/users", validation_1.validateUser, adminController_1.createUserByAdmin);
router.put("/users/:id", validation_1.validateUser, adminController_1.updateUser);
router.delete("/users/:id", adminController_1.deleteUser);
router.delete("/users/bulk", adminController_1.bulkDeleteUsers);
// Statistics route
router.get("/stats", adminController_1.getUserStats);
exports.default = router;
