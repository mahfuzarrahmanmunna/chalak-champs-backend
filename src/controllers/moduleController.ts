import { Response, NextFunction } from "express";
import mongoose from "mongoose"; // 1. Ensure mongoose is imported for Types.ObjectId
import Module, { IModule } from "../models/Module";
import { AuthRequest } from "../middleware/auth";
import { AppError, catchAsync } from "../middleware/errorHandler";

// @desc    Create a new module inside a course
// @route   POST /api/courses/:courseId/modules
// @access  Private (Instructor/Admin)
export const createModule = catchAsync(
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    // 2. Handle params safely (req.params can be string or string[])
    const { courseId } = req.params;
    const courseIdStr = Array.isArray(courseId) ? courseId[0] : courseId;

    const {
      title,
      description,
      scheduledPublishAt,
      order,
      thumbnail,
      videoUrl,
    } = req.body;

    // Validate ObjectId format to prevent runtime crashes
    if (!mongoose.Types.ObjectId.isValid(courseIdStr)) {
      return next(new AppError("Invalid Course ID format", 400));
    }

    // Logic to determine the next order if not provided
    let moduleOrder = order;
    if (!moduleOrder) {
      const lastModule = await Module.findOne({ courseId: courseIdStr }).sort(
        "-order",
      );
      moduleOrder = lastModule ? lastModule.order + 1 : 1;
    }

    const isScheduled =
      scheduledPublishAt && new Date(scheduledPublishAt) > new Date();

    // 3. FIX: Explicitly cast courseId to ObjectId
    const module = await Module.create({
      title,
      description,
      courseId: new mongoose.Types.ObjectId(courseIdStr),
      order: moduleOrder,
      thumbnail, // Added to match schema
      videoUrl, // Added to match schema
      scheduledPublishAt: isScheduled ? scheduledPublishAt : undefined,
      isPublished: !isScheduled,
      publishedAt: !isScheduled ? new Date() : undefined,
    });

    res.status(201).json({
      success: true,
      data: module,
      message: isScheduled
        ? `Module scheduled for ${new Date(scheduledPublishAt).toLocaleString()}`
        : "Module created successfully",
    });
  },
);

// @desc    Get all modules for a course (Admin View)
// @route   GET /api/courses/:courseId/modules
// @access  Private (Instructor/Admin)
export const getModulesByCourse = catchAsync(
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    const { courseId } = req.params;
    const courseIdStr = Array.isArray(courseId) ? courseId[0] : courseId;

    if (!mongoose.Types.ObjectId.isValid(courseIdStr)) {
      return next(new AppError("Invalid Course ID format", 400));
    }

    // Mongoose .find() handles string conversion automatically, but we pass the string directly
    const modules = await Module.find({ courseId: courseIdStr }).sort({
      order: 1,
    });

    res.status(200).json({
      success: true,
      data: modules,
    });
  },
);

// @desc    Update Module
// @route   PUT /api/modules/:id
// @access  Private (Instructor/Admin)
export const updateModule = catchAsync(
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const idStr = Array.isArray(id) ? id[0] : id;

    const { title, scheduledPublishAt, isPublished, thumbnail, videoUrl } =
      req.body;

    const module = await Module.findById(idStr);

    if (!module) {
      return next(new AppError("Module not found", 404));
    }

    // Handle scheduling logic
    if (scheduledPublishAt) {
      const scheduleDate = new Date(scheduledPublishAt);
      if (scheduleDate > new Date()) {
        module.scheduledPublishAt = scheduleDate;
        module.isPublished = false;
        module.publishedAt = undefined;
      } else {
        module.isPublished = true;
        module.publishedAt = new Date();
        module.scheduledPublishAt = undefined;
      }
    }

    if (title) module.title = title;
    if (thumbnail) module.thumbnail = thumbnail; // Update thumbnail
    if (videoUrl) module.videoUrl = videoUrl; // Update videoUrl

    if (typeof isPublished === "boolean" && !scheduledPublishAt) {
      module.isPublished = isPublished;
      if (isPublished) module.publishedAt = new Date();
    }

    await module.save();

    res.status(200).json({
      success: true,
      data: module,
      message: "Module updated successfully",
    });
  },
);

export const deleteModule = catchAsync(
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const idStr = Array.isArray(id) ? id[0] : id;

    await Module.findByIdAndDelete(idStr);

    res.status(200).json({ success: true, message: "Module deleted" });
  },
);
