"use strict";
// src/controllers/lessonController.ts
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAvailableExams = exports.deleteLesson = exports.updateLesson = exports.createLesson = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const errorHandler_1 = require("../middleware/errorHandler");
const Lesson_1 = __importDefault(require("../models/Lesson"));
const Exam_1 = __importDefault(require("../models/Exam"));
const Question_1 = __importDefault(require("../models/Question"));
const parseJSON = (value) => {
    if (!value)
        return undefined;
    try {
        return JSON.parse(value);
    }
    catch (e) {
        return value;
    }
};
// =============================================
// 1. CREATE LESSON (with Exam Support)
// =============================================
exports.createLesson = (0, errorHandler_1.catchAsync)(async (req, res, next) => {
    const moduleId = Array.isArray(req.params.moduleId)
        ? req.params.moduleId[0]
        : req.params.moduleId;
    // Verify module exists
    const Module = (await Promise.resolve().then(() => __importStar(require("../models/Module")))).default;
    const module = await Module.findById(moduleId);
    if (!module)
        return next(new errorHandler_1.AppError("Module not found", 404));
    // Determine order
    const lastLesson = await Lesson_1.default.findOne({ module: moduleId }).sort("-order");
    const nextOrder = lastLesson ? lastLesson.order + 1 : 1;
    const lessonType = req.body.type || "video";
    // ✅ Handle Exam-Type Lessons
    if (lessonType === "exam") {
        const examMode = req.body.examMode; // "existing" or "new"
        if (examMode === "existing" && req.body.examId) {
            // Link to existing exam
            if (!mongoose_1.default.Types.ObjectId.isValid(req.body.examId)) {
                return next(new errorHandler_1.AppError("Invalid exam ID", 400));
            }
            const existingExam = await Exam_1.default.findById(req.body.examId);
            if (!existingExam) {
                return next(new errorHandler_1.AppError("Selected exam not found", 404));
            }
            const lesson = await Lesson_1.default.create({
                module: moduleId,
                title: parseJSON(req.body.title) || { en: "Exam", bn: "পরীক্ষা" },
                type: "exam",
                order: nextOrder,
                duration: existingExam.duration,
                examId: existingExam._id, // ✅ FIX: Cast to ObjectId
                examConfig: {
                    duration: existingExam.duration,
                    passingMarks: existingExam.passingMarks,
                    negativeMarking: existingExam.negativeMarking,
                    isProctored: existingExam.isProctored,
                    totalQuestions: existingExam.questionBank?.length || 0,
                    totalMarks: existingExam.totalMarks,
                },
                isFreePreview: req.body.isFreePreview === "true",
            });
            return res.status(201).json({
                success: true,
                data: lesson,
                message: "Exam lesson created successfully",
            });
        }
        else if (examMode === "new") {
            // Create new exam and link it
            try {
                const questionsData = parseJSON(req.body.questions) || [];
                const questionIds = [];
                let computedTotalMarks = 0;
                // Create questions
                if (Array.isArray(questionsData) && questionsData.length > 0) {
                    for (const qData of questionsData) {
                        const textValue = typeof qData.text === "object"
                            ? qData.text.en || qData.text.bn || JSON.stringify(qData.text)
                            : qData.text || "";
                        const marksValue = Number(qData.marks) || 1;
                        computedTotalMarks += marksValue;
                        const question = await Question_1.default.create({
                            type: qData.type || "mcq",
                            text: textValue,
                            options: Array.isArray(qData.options) ? qData.options : [],
                            correctAnswer: qData.correctAnswer,
                            marks: marksValue,
                            difficulty: qData.difficulty || "medium",
                            explanation: qData.explanation,
                        });
                        questionIds.push(question._id); // ✅ FIX: Cast to ObjectId
                    }
                }
                // Create exam
                const parsedDuration = Number(req.body.examDuration) || 60;
                const parsedPassingMarks = Number(req.body.examPassingMarks) || 50;
                const parsedNegativeMarking = Number(req.body.examNegativeMarking) || 0;
                const parsedIsProctored = req.body.examIsProctored === "true" ||
                    req.body.examIsProctored === true;
                const examData = {
                    title: parseJSON(req.body.examTitle) || {
                        en: "Untitled Exam",
                        bn: "শিরোনামহীন পরীক্ষা",
                    },
                    description: parseJSON(req.body.examDescription),
                    duration: parsedDuration,
                    totalMarks: computedTotalMarks,
                    passingMarks: parsedPassingMarks,
                    negativeMarking: parsedNegativeMarking,
                    isProctored: parsedIsProctored,
                    questionBank: questionIds,
                    createdBy: req.user?._id,
                };
                // Handle exam thumbnail if provided
                if (req.files?.thumbnail?.[0]) {
                    const { uploadToImgBB, deleteLocalFile } = await Promise.resolve().then(() => __importStar(require("../utils/imgbb")));
                    const file = req.files.thumbnail[0];
                    const payload = file.buffer ? file.buffer : file.path;
                    const result = await uploadToImgBB(payload);
                    examData.image = result.url;
                    if (file.path)
                        deleteLocalFile(file.path);
                }
                const newExam = await Exam_1.default.create(examData);
                // Create lesson linked to new exam
                const lesson = await Lesson_1.default.create({
                    module: moduleId,
                    title: parseJSON(req.body.title) || { en: "Exam", bn: "পরীক্ষা" },
                    type: "exam",
                    order: nextOrder,
                    duration: parsedDuration,
                    examId: newExam._id, // ✅ FIX: Cast to ObjectId
                    examConfig: {
                        duration: parsedDuration,
                        passingMarks: parsedPassingMarks,
                        negativeMarking: parsedNegativeMarking,
                        isProctored: parsedIsProctored,
                        totalQuestions: questionIds.length,
                        totalMarks: computedTotalMarks,
                    },
                    isFreePreview: req.body.isFreePreview === "true",
                });
                return res.status(201).json({
                    success: true,
                    data: lesson,
                    exam: newExam,
                    message: "Exam lesson created successfully with new exam",
                });
            }
            catch (error) {
                return next(new errorHandler_1.AppError(error.message || "Failed to create exam lesson", 500));
            }
        }
        else {
            return next(new errorHandler_1.AppError("Please select an existing exam or create a new one", 400));
        }
    }
    // ✅ Handle Non-Exam Lessons (video, pdf, etc.)
    const lessonData = {
        module: moduleId,
        title: parseJSON(req.body.title) || { en: "", bn: "" },
        type: lessonType,
        videoUrl: req.body.videoUrl,
        content: req.body.content,
        order: nextOrder,
        duration: parseInt(req.body.duration) || 0,
        resources: parseJSON(req.body.resources) || [],
        quiz: parseJSON(req.body.quiz) || [],
        isFreePreview: req.body.isFreePreview === "true",
    };
    // Handle video upload if provided
    if (req.files?.video?.[0]) {
        const { uploadToImgBB, deleteLocalFile } = await Promise.resolve().then(() => __importStar(require("../utils/imgbb")));
        const file = req.files.video[0];
        const payload = file.buffer ? file.buffer : file.path;
        const result = await uploadToImgBB(payload);
        lessonData.videoUrl = result.url;
        if (file.path)
            deleteLocalFile(file.path);
    }
    const lesson = await Lesson_1.default.create(lessonData);
    res.status(201).json({
        success: true,
        data: lesson,
        message: "Lesson created successfully",
    });
});
// =============================================
// 2. UPDATE LESSON (with Exam Support)
// =============================================
exports.updateLesson = (0, errorHandler_1.catchAsync)(async (req, res, next) => {
    const { lessonId } = req.params;
    let lesson = await Lesson_1.default.findById(lessonId);
    if (!lesson)
        return next(new errorHandler_1.AppError("Lesson not found", 404));
    try {
        // Update basic fields
        if (req.body.title)
            lesson.title = parseJSON(req.body.title) || lesson.title;
        if (req.body.duration)
            lesson.duration = parseInt(req.body.duration);
        if (req.body.content)
            lesson.content = req.body.content;
        if (req.body.videoUrl)
            lesson.videoUrl = req.body.videoUrl;
        if (typeof req.body.isFreePreview !== "undefined") {
            lesson.isFreePreview = req.body.isFreePreview === "true";
        }
        // ✅ Handle Exam-Related Updates
        if (lesson.type === "exam") {
            if (req.body.examMode === "existing" && req.body.examId) {
                // Link to different existing exam
                const existingExam = await Exam_1.default.findById(req.body.examId);
                if (!existingExam) {
                    return next(new errorHandler_1.AppError("Selected exam not found", 404));
                }
                lesson.examId = existingExam._id; // ✅ FIX: Cast to ObjectId
                lesson.examConfig = {
                    duration: existingExam.duration,
                    passingMarks: existingExam.passingMarks,
                    negativeMarking: existingExam.negativeMarking,
                    isProctored: existingExam.isProctored,
                    totalQuestions: existingExam.questionBank?.length || 0,
                    totalMarks: existingExam.totalMarks,
                };
                lesson.duration = existingExam.duration;
            }
        }
        // Handle video upload if provided
        if (req.files?.video?.[0]) {
            const { uploadToImgBB, deleteLocalFile } = await Promise.resolve().then(() => __importStar(require("../utils/imgbb")));
            const file = req.files.video[0];
            const payload = file.buffer ? file.buffer : file.path;
            const result = await uploadToImgBB(payload);
            lesson.videoUrl = result.url;
            if (file.path)
                deleteLocalFile(file.path);
        }
        await lesson.save();
        res.status(200).json({
            success: true,
            data: lesson,
            message: "Lesson updated successfully",
        });
    }
    catch (error) {
        return next(new errorHandler_1.AppError(error.message || "Failed to update lesson", 500));
    }
});
// =============================================
// 3. DELETE LESSON
// =============================================
exports.deleteLesson = (0, errorHandler_1.catchAsync)(async (req, res, next) => {
    const { lessonId } = req.params;
    const lesson = await Lesson_1.default.findById(lessonId);
    if (!lesson)
        return next(new errorHandler_1.AppError("Lesson not found", 404));
    await lesson.deleteOne();
    res.status(200).json({
        success: true,
        message: "Lesson deleted successfully",
    });
});
// =============================================
// 4. GET AVAILABLE EXAMS (for dropdown)
// =============================================
exports.getAvailableExams = (0, errorHandler_1.catchAsync)(async (req, res, next) => {
    const exams = await Exam_1.default.find({
        createdBy: req.user?._id,
        isActive: true,
    })
        .select("_id title duration totalMarks passingMarks questionBank")
        .populate("questionBank", "_id")
        .sort("-createdAt");
    const formattedExams = exams.map((exam) => ({
        _id: exam._id,
        title: exam.title,
        duration: exam.duration,
        totalMarks: exam.totalMarks,
        passingMarks: exam.passingMarks,
        questionCount: exam.questionBank?.length || 0,
    }));
    res.status(200).json({
        success: true,
        data: formattedExams,
    });
});
