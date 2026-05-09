"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const moduleController_1 = require("../controllers/moduleController");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router({ mergeParams: true }); // Important for :courseId
// Multer Config
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        if (file.fieldname === "thumbnail")
            cb(null, "uploads/images/");
        else if (file.fieldname === "video")
            cb(null, "uploads/videos/");
        else
            cb(null, "uploads/misc/");
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        cb(null, file.fieldname + "-" + uniqueSuffix + path_1.default.extname(file.originalname));
    },
});
const upload = (0, multer_1.default)({
    storage: storage,
    limits: { fileSize: 500 * 1024 * 1024 }, // 500MB
});
router.use(auth_1.protect); // All routes require login
// Create Module (With File Uploads)
router.post("/", (0, auth_1.authorize)("instructor", "admin"), upload.fields([
    { name: "thumbnail", maxCount: 1 },
    { name: "video", maxCount: 1 },
]), moduleController_1.createModule);
// Get Modules (Course Dashboard)
router.get("/", moduleController_1.getModulesByCourse);
// Update Module
router.put("/:id", (0, auth_1.authorize)("instructor", "admin"), 
// If you want to allow updating files, add upload.fields here too
moduleController_1.updateModule);
router.delete("/:id", (0, auth_1.authorize)("instructor", "admin"), moduleController_1.deleteModule);
exports.default = router;
