import express from "express";
import multer from "multer";
import path from "path";
import {
  createModule,
  getModulesByCourse,
  updateModule,
  deleteModule,
} from "../controllers/moduleController";
import { protect, authorize } from "../middleware/auth";

const router = express.Router({ mergeParams: true }); // Important for :courseId

// Multer Config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (file.fieldname === "thumbnail") cb(null, "uploads/images/");
    else if (file.fieldname === "video") cb(null, "uploads/videos/");
    else cb(null, "uploads/misc/");
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(
      null,
      file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname),
    );
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB
});

router.use(protect); // All routes require login

// Create Module (With File Uploads)
router.post(
  "/",
  authorize("instructor", "admin"),
  upload.fields([
    { name: "thumbnail", maxCount: 1 },
    { name: "video", maxCount: 1 },
  ]),
  createModule,
);

// Get Modules (Course Dashboard)
router.get("/", getModulesByCourse);

// Update Module
router.put(
  "/:id",
  authorize("instructor", "admin"),
  // If you want to allow updating files, add upload.fields here too
  updateModule,
);

router.delete("/:id", authorize("instructor", "admin"), deleteModule);

export default router;
