"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteModule = exports.updateModule = exports.getModulesByCourse = exports.createModule = void 0;
const mongoose_1 = __importDefault(require("mongoose")); // 1. Ensure mongoose is imported for Types.ObjectId
const Module_1 = __importDefault(require("../models/Module"));
const errorHandler_1 = require("../middleware/errorHandler");
// @desc    Create a new module inside a course
// @route   POST /api/courses/:courseId/modules
// @access  Private (Instructor/Admin)
exports.createModule = (0, errorHandler_1.catchAsync)(async (req, res, next) => {
    // 2. Handle params safely (req.params can be string or string[])
    const { courseId } = req.params;
    const courseIdStr = Array.isArray(courseId) ? courseId[0] : courseId;
    const { title, description, scheduledPublishAt, order, thumbnail, videoUrl, } = req.body;
    // Validate ObjectId format to prevent runtime crashes
    if (!mongoose_1.default.Types.ObjectId.isValid(courseIdStr)) {
        return next(new errorHandler_1.AppError("Invalid Course ID format", 400));
    }
    // Logic to determine the next order if not provided
    let moduleOrder = order;
    if (!moduleOrder) {
        const lastModule = await Module_1.default.findOne({ courseId: courseIdStr }).sort("-order");
        moduleOrder = lastModule ? lastModule.order + 1 : 1;
    }
    const isScheduled = scheduledPublishAt && new Date(scheduledPublishAt) > new Date();
    // 3. FIX: Explicitly cast courseId to ObjectId
    const module = await Module_1.default.create({
        title,
        description,
        courseId: new mongoose_1.default.Types.ObjectId(courseIdStr),
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
});
// @desc    Get all modules for a course (Admin View)
// @route   GET /api/courses/:courseId/modules
// @access  Private (Instructor/Admin)
exports.getModulesByCourse = (0, errorHandler_1.catchAsync)(async (req, res, next) => {
    const { courseId } = req.params;
    const courseIdStr = Array.isArray(courseId) ? courseId[0] : courseId;
    if (!mongoose_1.default.Types.ObjectId.isValid(courseIdStr)) {
        return next(new errorHandler_1.AppError("Invalid Course ID format", 400));
    }
    // Mongoose .find() handles string conversion automatically, but we pass the string directly
    const modules = await Module_1.default.find({ courseId: courseIdStr }).sort({
        order: 1,
    });
    res.status(200).json({
        success: true,
        data: modules,
    });
});
// @desc    Update Module
// @route   PUT /api/modules/:id
// @access  Private (Instructor/Admin)
exports.updateModule = (0, errorHandler_1.catchAsync)(async (req, res, next) => {
    const { id } = req.params;
    const idStr = Array.isArray(id) ? id[0] : id;
    const { title, scheduledPublishAt, isPublished, thumbnail, videoUrl } = req.body;
    const module = await Module_1.default.findById(idStr);
    if (!module) {
        return next(new errorHandler_1.AppError("Module not found", 404));
    }
    // Handle scheduling logic
    if (scheduledPublishAt) {
        const scheduleDate = new Date(scheduledPublishAt);
        if (scheduleDate > new Date()) {
            module.scheduledPublishAt = scheduleDate;
            module.isPublished = false;
            module.publishedAt = undefined;
        }
        else {
            module.isPublished = true;
            module.publishedAt = new Date();
            module.scheduledPublishAt = undefined;
        }
    }
    if (title)
        module.title = title;
    if (thumbnail)
        module.thumbnail = thumbnail; // Update thumbnail
    if (videoUrl)
        module.videoUrl = videoUrl; // Update videoUrl
    if (typeof isPublished === "boolean" && !scheduledPublishAt) {
        module.isPublished = isPublished;
        if (isPublished)
            module.publishedAt = new Date();
    }
    await module.save();
    res.status(200).json({
        success: true,
        data: module,
        message: "Module updated successfully",
    });
});
exports.deleteModule = (0, errorHandler_1.catchAsync)(async (req, res, next) => {
    const { id } = req.params;
    const idStr = Array.isArray(id) ? id[0] : id;
    await Module_1.default.findByIdAndDelete(idStr);
    res.status(200).json({ success: true, message: "Module deleted" });
});
