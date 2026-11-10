"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.markLessonComplete = exports.updateLastAccessedLesson = exports.getCourseProgress = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const errorHandler_1 = require("../middleware/errorHandler");
const Progress_1 = __importDefault(require("../models/Progress"));
const Module_1 = __importDefault(require("../models/Module"));
const Lesson_1 = __importDefault(require("../models/Lesson"));
const getFlatLessons = async (courseId) => {
    const normalizedCourseId = Array.isArray(courseId) ? courseId[0] : courseId;
    const modules = await Module_1.default.find({ courseId: normalizedCourseId })
        .sort("order")
        .select("_id")
        .lean();
    const lessonsByModule = await Promise.all(modules.map((mod) => Lesson_1.default.find({ module: mod._id })
        .sort("order")
        .select("_id")
        .lean()));
    return lessonsByModule.flatMap((lessons) => lessons.map((lesson) => lesson._id));
};
// @desc    Get Course Progress
// @route   GET /api/courses/:courseId/progress
// @access  Private
exports.getCourseProgress = (0, errorHandler_1.catchAsync)(async (req, res) => {
    const { courseId } = req.params;
    const userId = req.user?._id;
    if (!userId) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    let progress = await Progress_1.default.findOne({ user: userId, course: courseId });
    const flatLessons = await getFlatLessons(courseId);
    const totalLessons = flatLessons.length;
    if (!progress) {
        const firstModule = await Module_1.default.findOne({ courseId })
            .sort("order")
            .select("_id")
            .lean();
        const firstLesson = firstModule
            ? await Lesson_1.default.findOne({ module: firstModule._id })
                .sort("order")
                .select("_id")
                .lean()
            : null;
        progress = await Progress_1.default.create({
            user: userId,
            course: courseId,
            completedLessons: [],
            lastAccessedModule: firstModule?._id,
            lastAccessedLesson: firstLesson?._id,
            progressPercentage: 0,
        });
    }
    const completedCount = progress.completedLessons.length;
    const percentage = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;
    if (progress.progressPercentage !== percentage) {
        progress.progressPercentage = percentage;
        await progress.save();
    }
    res.status(200).json({
        success: true,
        data: {
            completedLessons: progress.completedLessons,
            lastAccessedModule: progress.lastAccessedModule,
            lastAccessedLesson: progress.lastAccessedLesson,
            progressPercentage: percentage,
            completedLessonsCount: completedCount,
            totalLessons: totalLessons,
        },
    });
});
// @desc    Update Last Accessed Lesson
// @route   PATCH /api/courses/:courseId/progress
// @access  Private
exports.updateLastAccessedLesson = (0, errorHandler_1.catchAsync)(async (req, res) => {
    const { courseId } = req.params;
    const { moduleId, lessonId } = req.body;
    const userId = req.user?._id;
    if (!userId) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    const progress = await Progress_1.default.findOneAndUpdate({ user: userId, course: courseId }, { lastAccessedModule: moduleId, lastAccessedLesson: lessonId }, { upsert: true, new: true });
    res.status(200).json({ success: true, data: progress });
});
// @desc    Mark a lesson as complete
// @route   POST /api/courses/:courseId/modules/:moduleId/lessons/:lessonId/complete
// @access  Private
exports.markLessonComplete = (0, errorHandler_1.catchAsync)(async (req, res) => {
    const { courseId, moduleId, lessonId } = req.params;
    const userId = req.user?._id;
    if (!userId) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    if (!mongoose_1.default.Types.ObjectId.isValid(String(courseId)) ||
        !mongoose_1.default.Types.ObjectId.isValid(String(moduleId)) ||
        !mongoose_1.default.Types.ObjectId.isValid(String(lessonId))) {
        return res.status(400).json({
            success: false,
            message: "Invalid course, module, or lesson ID.",
        });
    }
    const lessonObjectId = new mongoose_1.default.Types.ObjectId(String(lessonId));
    const module = await Module_1.default.findOne({
        _id: moduleId,
        courseId,
    })
        .select("_id")
        .lean();
    const lesson = await Lesson_1.default.findOne({
        _id: lessonObjectId,
        module: moduleId,
    })
        .select("_id")
        .lean();
    if (!module || !lesson) {
        return res
            .status(404)
            .json({ success: false, message: "Lesson not found in course." });
    }
    // Find or create progress document
    let progress = await Progress_1.default.findOne({ user: userId, course: courseId });
    if (!progress) {
        progress = new Progress_1.default({
            user: userId,
            course: courseId,
            completedLessons: [],
        });
    }
    // Prevent duplicates
    if (progress.completedLessons.some((id) => id.equals(lessonObjectId))) {
        return res
            .status(200)
            .json({ success: true, message: "Lesson already completed" });
    }
    // 🔒 BACKEND SEQUENTIAL VALIDATION
    const flatLessons = await getFlatLessons(String(courseId));
    const currentIndex = flatLessons.findIndex((l) => l.equals(lessonObjectId));
    if (currentIndex === -1) {
        return res
            .status(404)
            .json({ success: false, message: "Lesson not found in course." });
    }
    if (currentIndex > 0) {
        const previousLessonId = flatLessons[currentIndex - 1];
        if (!progress.completedLessons.some((id) => id.equals(previousLessonId))) {
            return res.status(403).json({
                success: false,
                message: "Please complete the previous lesson first.",
            });
        }
    }
    // Add to completed and update last accessed
    progress.completedLessons.push(lessonObjectId);
    progress.lastAccessedModule = new mongoose_1.default.Types.ObjectId(String(moduleId));
    progress.lastAccessedLesson = lessonObjectId;
    // Calculate new percentage
    const totalLessons = flatLessons.length;
    progress.progressPercentage =
        totalLessons > 0
            ? Math.round((progress.completedLessons.length / totalLessons) * 100)
            : 0;
    await progress.save();
    res.status(200).json({
        success: true,
        message: "Lesson marked as complete",
        data: {
            completedLessons: progress.completedLessons,
            lastAccessedModule: progress.lastAccessedModule,
            lastAccessedLesson: progress.lastAccessedLesson,
            progressPercentage: progress.progressPercentage,
            completedLessonsCount: progress.completedLessons.length,
            totalLessons,
        },
    });
});
