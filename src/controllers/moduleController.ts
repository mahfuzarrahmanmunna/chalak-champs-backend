import { Response, NextFunction } from "express";
import Module, { IModule } from "../models/Module";
import { AuthRequest } from "../middleware/auth";
import { AppError, catchAsync } from "../middleware/errorHandler";

// @desc    Create a new module inside a course
// @route   POST /api/courses/:courseId/modules
// @access  Private (Instructor/Admin)
export const createModule = catchAsync(
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    const { courseId } = req.params;
    const { title, description, scheduledPublishAt, order } = req.body;

    // Logic to determine the next order if not provided
    let moduleOrder = order;
    if (!moduleOrder) {
      const lastModule = await Module.findOne({ courseId }).sort("-order");
      moduleOrder = lastModule ? lastModule.order + 1 : 1;
    }

    const isScheduled =
      scheduledPublishAt && new Date(scheduledPublishAt) > new Date();

    const module = await Module.create({
      title,
      description,
      courseId,
      order: moduleOrder,
      scheduledPublishAt: isScheduled ? scheduledPublishAt : undefined,
      isPublished: !isScheduled, // If no schedule, publish immediately or draft? Let's say draft default unless scheduled.
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

    // FIX: Removed .populate("lessons") because the 'lessons' field does not exist in your Module schema yet.
    const modules = await Module.find({ courseId }).sort({ order: 1 });

    res.status(200).json({
      success: true,
      data: modules,
    });
  },
);

// @desc    Update Module (e.g., change schedule time)
// @route   PUT /api/modules/:id
// @access  Private (Instructor/Admin)
export const updateModule = catchAsync(
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const { title, scheduledPublishAt, isPublished } = req.body;

    const module = await Module.findById(id);

    if (!module) {
      return next(new AppError("Module not found", 404));
    }

    // Handle scheduling logic
    if (scheduledPublishAt) {
      const scheduleDate = new Date(scheduledPublishAt);
      if (scheduleDate > new Date()) {
        module.scheduledPublishAt = scheduleDate;
        module.isPublished = false; // Unpublish if rescheduled for future
        module.publishedAt = undefined;
      } else {
        // If time is past, publish immediately
        module.isPublished = true;
        module.publishedAt = new Date();
        module.scheduledPublishAt = undefined;
      }
    }

    if (title) module.title = title;
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
    await Module.findByIdAndDelete(id);
    // TODO: Also delete associated lessons or reassign them

    res.status(200).json({ success: true, message: "Module deleted" });
  },
);
