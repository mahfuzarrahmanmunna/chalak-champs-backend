"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteLesson = exports.updateLesson = exports.getLessonById = exports.createLesson = exports.deleteModule = exports.updateModule = exports.getCourseStructure = exports.createModule = void 0;
const errorHandler_1 = require("../middleware/errorHandler");
const Module_1 = __importDefault(require("../models/Module"));
const Lesson_1 = __importDefault(require("../models/Lesson"));
const Course_1 = __importDefault(require("../models/Course"));
// Helper to safely get a string from params
const getParam = (param) => {
    return Array.isArray(param) ? param[0] : param;
};
// --- MODULES ---
exports.createModule = (0, errorHandler_1.catchAsync)(async (req, res, next) => {
    const courseId = getParam(req.params.courseId);
    const { title, description } = req.body;
    const course = await Course_1.default.findById(courseId);
    if (!course)
        return next(new errorHandler_1.AppError("Course not found", 404));
    const count = await Module_1.default.countDocuments({ courseId });
    const module = await Module_1.default.create({
        courseId,
        title,
        description,
        order: count + 1,
    });
    res.status(201).json({ success: true, data: module });
});
exports.getCourseStructure = (0, errorHandler_1.catchAsync)(async (req, res, next) => {
    const courseId = getParam(req.params.courseId);
    const course = await Course_1.default.findById(courseId);
    if (!course)
        return next(new errorHandler_1.AppError("Course not found", 404));
    const modules = await Module_1.default.find({ courseId }).sort({
        order: 1,
    });
    const structure = await Promise.all(modules.map(async (mod) => {
        // FIX: Added 'as any'
        const lessons = await Lesson_1.default.find({ module: mod._id }).sort({
            order: 1,
        });
        return {
            _id: mod._id,
            title: mod.title,
            description: mod.description,
            order: mod.order,
            lessons: lessons,
        };
    }));
    res.status(200).json({
        success: true,
        data: {
            course,
            curriculum: structure,
        },
    });
});
exports.updateModule = (0, errorHandler_1.catchAsync)(async (req, res, next) => {
    const id = getParam(req.params.id);
    const module = await Module_1.default.findByIdAndUpdate(id, req.body, {
        new: true,
        runValidators: true,
    });
    if (!module)
        return next(new errorHandler_1.AppError("Module not found", 404));
    res.status(200).json({ success: true, data: module });
});
exports.deleteModule = (0, errorHandler_1.catchAsync)(async (req, res, next) => {
    const id = getParam(req.params.id);
    // FIX: Added 'as any'
    await Lesson_1.default.deleteMany({ module: id });
    await Module_1.default.findByIdAndDelete(id);
    res.status(200).json({ success: true, message: "Module deleted" });
});
// --- LESSONS ---
exports.createLesson = (0, errorHandler_1.catchAsync)(async (req, res, next) => {
    const moduleId = getParam(req.params.moduleId);
    const { title, content, videoUrl, duration, quiz } = req.body;
    const moduleExists = await Module_1.default.findById(moduleId);
    if (!moduleExists)
        return next(new errorHandler_1.AppError("Module not found", 404));
    let parsedContent = content;
    if (typeof content === "string") {
        try {
            parsedContent = JSON.parse(content);
        }
        catch (e) {
            return next(new errorHandler_1.AppError("Invalid JSON format for content", 400));
        }
    }
    // FIX: Added 'as any'
    const count = await Lesson_1.default.countDocuments({ module: moduleId });
    const lesson = await Lesson_1.default.create({
        module: moduleId,
        title,
        content: parsedContent,
        videoUrl,
        duration,
        quiz,
        order: count + 1,
    });
    res.status(201).json({ success: true, data: lesson });
});
exports.getLessonById = (0, errorHandler_1.catchAsync)(async (req, res, next) => {
    const id = getParam(req.params.id);
    const lesson = await Lesson_1.default.findById(id).populate({
        path: "module",
        populate: { path: "courseId" },
    });
    if (!lesson)
        return next(new errorHandler_1.AppError("Lesson not found", 404));
    res.status(200).json({ success: true, data: lesson });
});
exports.updateLesson = (0, errorHandler_1.catchAsync)(async (req, res, next) => {
    const id = getParam(req.params.id);
    let updateData = { ...req.body };
    if (req.body.content && typeof req.body.content === "string") {
        updateData.content = JSON.parse(req.body.content);
    }
    const lesson = await Lesson_1.default.findByIdAndUpdate(id, updateData, {
        new: true,
        runValidators: true,
    });
    if (!lesson)
        return next(new errorHandler_1.AppError("Lesson not found", 404));
    res.status(200).json({ success: true, data: lesson });
});
exports.deleteLesson = (0, errorHandler_1.catchAsync)(async (req, res, next) => {
    const id = getParam(req.params.id);
    await Lesson_1.default.findByIdAndDelete(id);
    res.status(200).json({ success: true, message: "Lesson deleted" });
});
