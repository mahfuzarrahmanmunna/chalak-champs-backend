"use strict";
// src/controllers/moduleController.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteLesson = exports.getModulesByCourse = exports.createLesson = exports.deleteModule = exports.updateModule = exports.getCourseModules = exports.createModule = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const errorHandler_1 = require("../middleware/errorHandler");
const Module_1 = __importDefault(require("../models/Module"));
const Lesson_1 = __importDefault(require("../models/Lesson"));
const imgbb_1 = require("../utils/imgbb");
const getCourseId = (params) => (params.courseId || params.id);
// =============================================
// 1. CREATE MODULE
// =============================================
exports.createModule = (0, errorHandler_1.catchAsync)(async (req, res, next) => {
    const courseId = getCourseId(req.params);
    const { title } = req.body ?? {};
    const files = req.files;
    if (!title) {
        return next(new errorHandler_1.AppError("Module title is required", 400));
    }
    const lastModule = await Module_1.default.findOne({ courseId }).sort("-order");
    const nextOrder = lastModule ? lastModule.order + 1 : 1;
    const isPublished = req.body.isPublished === "true" || req.body.isPublished === true;
    const moduleFields = {
        courseId: new mongoose_1.default.Types.ObjectId(courseId),
        title,
        order: nextOrder,
    };
    if (req.body.titleBn)
        moduleFields.titleBn = req.body.titleBn;
    if (req.body.description)
        moduleFields.description = req.body.description;
    if (req.body.videoUrl)
        moduleFields.videoUrl = req.body.videoUrl;
    if (typeof req.body.isPublished !== "undefined") {
        moduleFields.isPublished = isPublished;
        if (isPublished)
            moduleFields.publishedAt = new Date();
    }
    try {
        if (files?.thumbnail?.[0]) {
            const file = files.thumbnail[0];
            const payload = file.buffer ? file.buffer : file.path;
            const result = await (0, imgbb_1.uploadToImgBB)(payload);
            moduleFields.thumbnail = result.url;
            if (file.path)
                (0, imgbb_1.deleteLocalFile)(file.path);
        }
        if (files?.video?.[0]) {
            const file = files.video[0];
            const payload = file.buffer ? file.buffer : file.path;
            const result = await (0, imgbb_1.uploadToImgBB)(payload);
            moduleFields.videoUrl = result.url;
            if (file.path)
                (0, imgbb_1.deleteLocalFile)(file.path);
        }
        const newModule = await Module_1.default.create(moduleFields);
        res.status(201).json({
            success: true,
            data: newModule,
        });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : "Failed to create module";
        return next(new errorHandler_1.AppError(message, 500));
    }
});
// =============================================
// 2. GET MODULES WITH LESSONS
// =============================================
// Update the getCourseModules function in moduleController.ts
exports.getCourseModules = (0, errorHandler_1.catchAsync)(async (req, res, next) => {
    const courseId = getCourseId(req.params);
    const modules = await Module_1.default.find({ courseId }).sort("order");
    const moduleIds = modules.map((m) => m._id);
    const lessons = await Lesson_1.default.find({ module: { $in: moduleIds } })
        .sort("order")
        .populate("examId"); // ✅ NEW: Populate exam data
    const modulesWithLessons = modules.map((mod) => ({
        ...mod.toObject(),
        lessons: lessons.filter((l) => l.module.toString() === mod._id.toString()),
    }));
    res.status(200).json({
        success: true,
        data: modulesWithLessons,
    });
});
// =============================================
// 3. UPDATE MODULE
// =============================================
exports.updateModule = (0, errorHandler_1.catchAsync)(async (req, res, next) => {
    const { moduleId } = req.params;
    // ✅ FIX: Extract files from req.files
    const files = req.files;
    let module = await Module_1.default.findById(moduleId);
    if (!module) {
        return next(new errorHandler_1.AppError("Module not found", 404));
    }
    try {
        // Handle Thumbnail Update
        if (files?.thumbnail?.[0]) {
            const file = files.thumbnail[0];
            const payload = file.buffer ? file.buffer : file.path;
            const result = await (0, imgbb_1.uploadToImgBB)(payload);
            module.thumbnail = result.url;
            if (file.path)
                (0, imgbb_1.deleteLocalFile)(file.path);
        }
        // Handle Video Update
        if (files?.video?.[0]) {
            const file = files.video[0];
            const payload = file.buffer ? file.buffer : file.path;
            const result = await (0, imgbb_1.uploadToImgBB)(payload);
            module.videoUrl = result.url;
            if (file.path)
                (0, imgbb_1.deleteLocalFile)(file.path);
        }
        else if (req.body.videoUrl) {
            module.videoUrl = req.body.videoUrl;
        }
        // Update Text Fields
        if (req.body.title)
            module.title = req.body.title;
        if (req.body.titleBn)
            module.titleBn = req.body.titleBn;
        if (req.body.description)
            module.description = req.body.description;
        if (typeof req.body.isPublished !== "undefined") {
            const published = req.body.isPublished === "true" || req.body.isPublished === true;
            module.isPublished = published;
            module.publishedAt = published ? new Date() : undefined;
        }
        await module.save();
        res.status(200).json({
            success: true,
            data: module,
            message: "Module updated successfully",
        });
    }
    catch (error) {
        return next(new errorHandler_1.AppError(error.message || "Failed to update module", 500));
    }
});
// =============================================
// 4. DELETE MODULE
// =============================================
exports.deleteModule = (0, errorHandler_1.catchAsync)(async (req, res, next) => {
    const { moduleId } = req.params;
    const module = await Module_1.default.findById(moduleId);
    if (!module) {
        return next(new errorHandler_1.AppError("Module not found", 404));
    }
    try {
        // Delete all lessons inside this module
        await Lesson_1.default.deleteMany({ module: moduleId });
        await module.deleteOne();
        res.status(200).json({
            success: true,
            message: "Module deleted successfully",
        });
    }
    catch (error) {
        return next(new errorHandler_1.AppError(error.message || "Failed to delete module", 500));
    }
});
// =============================================
// 5. CREATE LESSON
// =============================================
exports.createLesson = (0, errorHandler_1.catchAsync)(async (req, res, next) => {
    const { moduleId } = req.params;
    const module = await Module_1.default.findById(moduleId);
    if (!module)
        return next(new errorHandler_1.AppError("Module not found", 404));
    // Determine order
    const lastLesson = await Lesson_1.default.findOne({ module: moduleId }).sort("-order");
    const nextOrder = lastLesson ? lastLesson.order + 1 : 1;
    const lessonData = {
        module: moduleId,
        title: req.body.title, // { en, bn }
        videoUrl: req.body.videoUrl,
        content: req.body.content,
        order: nextOrder,
        duration: parseInt(req.body.duration) || 0,
        resources: req.body.resources ? JSON.parse(req.body.resources) : [],
        quiz: req.body.quiz ? JSON.parse(req.body.quiz) : [],
        isFreePreview: req.body.isFreePreview === "true",
        type: req.body.type || "video",
    };
    const lesson = await Lesson_1.default.create(lessonData);
    res.status(201).json({
        success: true,
        data: lesson,
    });
});
// Alias for backwards compatibility
exports.getModulesByCourse = exports.getCourseModules;
// =============================================
// 6. DELETE LESSON
// =============================================
exports.deleteLesson = (0, errorHandler_1.catchAsync)(async (req, res, next) => {
    const { lessonId } = req.params;
    const lesson = await Lesson_1.default.findByIdAndDelete(lessonId);
    if (!lesson)
        return next(new errorHandler_1.AppError("Lesson not found", 404));
    res.status(200).json({
        success: true,
        message: "Lesson deleted successfully",
    });
});
// Update the getCourseModules function in moduleController.ts
