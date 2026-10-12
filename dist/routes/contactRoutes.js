"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const contactController_1 = require("../controllers/contactController");
const auth_1 = require("../middleware/auth"); // Adjust path based on your project structure
const router = express_1.default.Router();
// Public Route: POST /api/contact
router.route("/").post(contactController_1.submitContactForm);
// Private/Admin Route: GET /api/contact
router.route("/").get(auth_1.protect, contactController_1.getContactInquiries);
exports.default = router;
