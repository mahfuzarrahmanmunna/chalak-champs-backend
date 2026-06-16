"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteLesson = exports.getModulesByCourse = exports.createLesson = exports.deleteModule = exports.updateModule = exports.getCourseModules = exports.createModule = void 0;
const errorHandler_1 = require("../middleware/errorHandler");
// RENAME IMPORT to ModuleModel to avoid conflict with Express Router
const Module_1 = __importDefault(require("../models/Module"));
const Lesson_1 = __importDefault(require("../models/Lesson"));
const imgbb_1 = require("../utils/imgbb");
const getCourseId = (params) => (params.courseId || params.id);
// 1. CREATE MODULE
exports.createModule = (0, errorHandler_1.catchAsync)(async (req, res, next) => {
    const courseId = getCourseId(req.params);
    const { title } = req.body;
    // Find max order to append at the end
    const lastModule = await Module_1.default.findOne({ courseId }).sort("-order");
    const nextOrder = lastModule ? lastModule.order + 1 : 1;
    const newModule = await Module_1.default.create({
        courseId,
        title,
        order: nextOrder,
    });
    res.status(201).json({
        success: true,
        data: newModule,
    });
});
// 2. GET MODULES WITH LESSONS
exports.getCourseModules = (0, errorHandler_1.catchAsync)(async (req, res, next) => {
    const courseId = getCourseId(req.params);
    const modules = await Module_1.default.find({ courseId }).sort("order");
    // Fetch lessons for each module
    const moduleIds = modules.map((m) => m._id);
    const lessons = await Lesson_1.default.find({ module: { $in: moduleIds } }).sort("order");
    // Map lessons to their modules
    const modulesWithLessons = modules.map((mod) => ({
        ...mod.toObject(),
        lessons: lessons.filter((l) => l.module.toString() === mod._id.toString()),
    }));
    res.status(200).json({
        success: true,
        data: modulesWithLessons,
    });
});
// 3. UPDATE MODULE (MISSING FUNCTION)
exports.updateModule = (0, errorHandler_1.catchAsync)(async (req, res, next) => {
    const { id } = req.params;
    const files = req.files;
    let module = await Module_1.default.findById(id);
    if (!module) {
        return next(new errorHandler_1.AppError("Module not found", 404));
    }
    try {
        // Handle Thumbnail Update
        if (files && files.thumbnail && files.thumbnail[0]) {
            const file = files.thumbnail[0];
            const payload = file.buffer ? file.buffer : file.path;
            const result = await (0, imgbb_1.uploadToImgBB)(payload);
            module.thumbnail = result.url;
            if (file.path)
                (0, imgbb_1.deleteLocalFile)(file.path);
        }
        // Handle Video Update
        if (files && files.video && files.video[0]) {
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
        if (typeof req.body.isPublished !== "undefined") {
            module.isPublished = req.body.isPublished;
            module.publishedAt = req.body.isPublished ? new Date() : undefined;
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
// 4. DELETE MODULE (MISSING FUNCTION)
exports.deleteModule = (0, errorHandler_1.catchAsync)(async (req, res, next) => {
    const { id } = req.params;
    const module = await Module_1.default.findById(id);
    if (!module) {
        return next(new errorHandler_1.AppError("Module not found", 404));
    }
    try {
        // Optional: Delete all lessons inside this module
        await Lesson_1.default.deleteMany({ module: id });
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
// 5. CREATE LESSON
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
exports.getModulesByCourse = exports.getCourseModules;
// 6. DELETE LESSON
exports.deleteLesson = (0, errorHandler_1.catchAsync)(async (req, res, next) => {
    const lesson = await Lesson_1.default.findByIdAndDelete(req.params.id);
    if (!lesson)
        return next(new errorHandler_1.AppError("Lesson not found", 404));
    res.status(200).json({ success: true, message: "Lesson deleted" });
});
