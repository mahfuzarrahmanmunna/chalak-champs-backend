"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.enrollInBatch = exports.getBatchesByCourse = exports.createBatch = void 0;
const errorHandler_1 = require("../middleware/errorHandler");
const Batch_1 = __importDefault(require("../models/Batch"));
const Course_1 = __importDefault(require("../models/Course"));
// Helper to safely get a string from params (handles string | string[])
const getParam = (param) => {
    return Array.isArray(param) ? param[0] : param;
};
exports.createBatch = (0, errorHandler_1.catchAsync)(async (req, res, next) => {
    const courseId = getParam(req.params.courseId);
    const { name, startDate, endDate, maxSeats, schedule, instructor } = req.body;
    const course = await Course_1.default.findById(courseId);
    if (!course)
        return next(new errorHandler_1.AppError("Course not found", 404));
    const batch = await Batch_1.default.create({
        course: courseId,
        name,
        instructor: instructor || req.user?._id,
        startDate,
        endDate,
        maxSeats,
        schedule,
    });
    res.status(201).json({ success: true, data: batch });
});
exports.getBatchesByCourse = (0, errorHandler_1.catchAsync)(async (req, res, next) => {
    const courseId = getParam(req.params.courseId);
    const { page = 1, limit = 10, status = "all" } = req.query;
    // Define query type explicitly or handle courseId correctly
    const query = { course: courseId };
    if (status === "active")
        query.isActive = true;
    if (status === "inactive")
        query.isActive = false;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;
    const batches = await Batch_1.default.find(query)
        .populate("instructor", "name email")
        .populate("enrolledStudents", "name avatar")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum);
    const total = await Batch_1.default.countDocuments(query);
    res.status(200).json({
        success: true,
        count: batches.length,
        pagination: { page: pageNum, pages: Math.ceil(total / limitNum), total },
        data: batches,
    });
});
exports.enrollInBatch = (0, errorHandler_1.catchAsync)(async (req, res, next) => {
    const batchId = getParam(req.params.batchId);
    const userId = req.user._id;
    const batch = await Batch_1.default.findById(batchId);
    if (!batch)
        return next(new errorHandler_1.AppError("Batch not found", 404));
    if (!batch.isActive)
        return next(new errorHandler_1.AppError("Batch is not active", 400));
    if (batch.enrolledStudents.length >= batch.maxSeats) {
        return next(new errorHandler_1.AppError("Batch is full", 400));
    }
    if (batch.enrolledStudents.includes(userId)) {
        return next(new errorHandler_1.AppError("Already enrolled", 400));
    }
    batch.enrolledStudents.push(userId);
    await batch.save();
    res
        .status(200)
        .json({ success: true, message: "Enrolled successfully", data: batch });
});
