"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const moduleController_1 = require("../controllers/moduleController");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router({ mergeParams: true }); // mergeParams to access :courseId from parent route
router.use(auth_1.protect); // All routes require login
router
    .route("/")
    .post((0, auth_1.authorize)("instructor", "admin"), moduleController_1.createModule)
    .get(moduleController_1.getModulesByCourse); // Usually instructors need this too
router
    .route("/:id")
    .put((0, auth_1.authorize)("instructor", "admin"), moduleController_1.updateModule)
    .delete((0, auth_1.authorize)("instructor", "admin"), moduleController_1.deleteModule);
exports.default = router;
