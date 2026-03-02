"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.unpublishCourse = exports.publishCourse = exports.getCoursesByInstructor = exports.deleteCourse = exports.updateCourse = exports.getCourseById = exports.getCourses = exports.createCourse = void 0;
const Course_1 = require("../models/Course");
const errorHandler_1 = require("../middleware/errorHandler");
const cloudinary_1 = require("../utils/cloudinary");
const fs_1 = __importDefault(require("fs"));
// @desc    Create a new course
// @route   POST /api/courses
// @access  Private (Instructor/Admin)
exports.createCourse = (0, errorHandler_1.catchAsync)(async (req, res, next) => {
    const courseData = {
        ...req.body,
        instructor: req.user._id,
    };
    // Handle file uploads
    if (req.files) {
        const files = req.files;
        if (files.thumbnail) {
            const thumbnailPath = files.thumbnail[0].path;
            const thumbnailResult = await (0, cloudinary_1.uploadToCloudinary)(thumbnailPath, "course-thumbnails");
            courseData.thumbnail = thumbnailResult.secure_url;
            // Delete local file after upload
            fs_1.default.unlinkSync(thumbnailPath);
        }
        if (files.video) {
            const videoPath = files.video[0].path;
            const videoResult = await (0, cloudinary_1.uploadToCloudinary)(videoPath, "course-videos");
            courseData.introVideo = videoResult.secure_url;
            // Delete local file after upload
            fs_1.default.unlinkSync(videoPath);
        }
    }
    const course = await Course_1.Course.create(courseData);
    res.status(201).json({
        success: true,
        data: course,
        message: "Course created successfully",
    });
});
// @desc    Get all courses
// @route   GET /api/courses
// @access  Public
exports.getCourses = (0, errorHandler_1.catchAsync)(async (req, res, next) => {
    const { page = 1, limit = 10, category, level, language, search, sort = "-createdAt", isPublished, } = req.query;
    // Build query
    const query = {};
    if (isPublished !== undefined) {
        query.isPublished = isPublished === "true";
    }
    if (category) {
        query.category = category;
    }
    if (level) {
        query.level = level;
    }
    if (language) {
        query.language = language;
    }
    if (search) {
        query.$or = [
            { title: { $regex: search, $options: "i" } },
            { titleBn: { $regex: search, $options: "i" } },
            { description: { $regex: search, $options: "i" } },
            { descriptionBn: { $regex: search, $options: "i" } },
            { tags: { $in: [new RegExp(search, "i")] } },
        ];
    }
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;
    const courses = await Course_1.Course.find(query)
        .populate("instructor", "name email")
        .sort(sort)
        .skip(skip)
        .limit(limitNum);
    const total = await Course_1.Course.countDocuments(query);
    res.status(200).json({
        success: true,
        data: courses,
        pagination: {
            page: pageNum,
            limit: limitNum,
            total,
            pages: Math.ceil(total / limitNum),
        },
    });
});
// @desc    Get single course by ID
// @route   GET /api/courses/:id
// @access  Public
exports.getCourseById = (0, errorHandler_1.catchAsync)(async (req, res, next) => {
    const course = await Course_1.Course.findById(req.params.id)
        .populate("instructor", "name email bio")
        .populate("lessons");
    if (!course) {
        return next(new errorHandler_1.AppError("Course not found", 404));
    }
    res.status(200).json({
        success: true,
        data: course,
    });
});
// @desc    Update course
// @route   PUT /api/courses/:id
// @access  Private (Instructor/Admin)
exports.updateCourse = (0, errorHandler_1.catchAsync)(async (req, res, next) => {
    let course = await Course_1.Course.findById(req.params.id);
    if (!course) {
        return next(new errorHandler_1.AppError("Course not found", 404));
    }
    // Check if user is course instructor or admin
    if (course.instructor.toString() !== req.user._id.toString() &&
        req.user.role !== "admin") {
        return next(new errorHandler_1.AppError("Not authorized to update this course", 403));
    }
    // Handle file uploads
    const updateData = { ...req.body };
    if (req.files) {
        const files = req.files;
        if (files.thumbnail) {
            const thumbnailPath = files.thumbnail[0].path;
            const thumbnailResult = await (0, cloudinary_1.uploadToCloudinary)(thumbnailPath, "course-thumbnails");
            updateData.thumbnail = thumbnailResult.secure_url;
            // Delete local file after upload
            fs_1.default.unlinkSync(thumbnailPath);
        }
        if (files.video) {
            const videoPath = files.video[0].path;
            const videoResult = await (0, cloudinary_1.uploadToCloudinary)(videoPath, "course-videos");
            updateData.introVideo = videoResult.secure_url;
            // Delete local file after upload
            fs_1.default.unlinkSync(videoPath);
        }
    }
    course = await Course_1.Course.findByIdAndUpdate(req.params.id, updateData, {
        new: true,
        runValidators: true,
    });
    res.status(200).json({
        success: true,
        data: course,
        message: "Course updated successfully",
    });
});
// @desc    Delete course
// @route   DELETE /api/courses/:id
// @access  Private (Instructor/Admin)
exports.deleteCourse = (0, errorHandler_1.catchAsync)(async (req, res, next) => {
    const course = await Course_1.Course.findById(req.params.id);
    if (!course) {
        return next(new errorHandler_1.AppError("Course not found", 404));
    }
    // Check if user is course instructor or admin
    if (course.instructor.toString() !== req.user._id.toString() &&
        req.user.role !== "admin") {
        return next(new errorHandler_1.AppError("Not authorized to delete this course", 403));
    }
    await Course_1.Course.findByIdAndDelete(req.params.id);
    res.status(200).json({
        success: true,
        message: "Course deleted successfully",
    });
});
// @desc    Get courses by instructor
// @route   GET /api/courses/instructor/my-courses
// @access  Private (Instructor/Admin)
exports.getCoursesByInstructor = (0, errorHandler_1.catchAsync)(async (req, res, next) => {
    const { page = 1, limit = 10, isPublished, sort = "-createdAt", } = req.query;
    const query = { instructor: req.user._id };
    if (isPublished !== undefined) {
        query.isPublished = isPublished === "true";
    }
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;
    const courses = await Course_1.Course.find(query)
        .sort(sort)
        .skip(skip)
        .limit(limitNum);
    const total = await Course_1.Course.countDocuments(query);
    res.status(200).json({
        success: true,
        data: courses,
        pagination: {
            page: pageNum,
            limit: limitNum,
            total,
            pages: Math.ceil(total / limitNum),
        },
    });
});
// @desc    Publish course
// @route   PATCH /api/courses/:id/publish
// @access  Private (Instructor/Admin)
exports.publishCourse = (0, errorHandler_1.catchAsync)(async (req, res, next) => {
    const course = await Course_1.Course.findById(req.params.id);
    if (!course) {
        return next(new errorHandler_1.AppError("Course not found", 404));
    }
    // Check if user is course instructor or admin
    if (course.instructor.toString() !== req.user._id.toString() &&
        req.user.role !== "admin") {
        return next(new errorHandler_1.AppError("Not authorized to publish this course", 403));
    }
    course.isPublished = true;
    course.publishedAt = new Date();
    await course.save();
    res.status(200).json({
        success: true,
        data: course,
        message: "Course published successfully",
    });
});
// @desc    Unpublish course
// @route   PATCH /api/courses/:id/unpublish
// @access  Private (Instructor/Admin)
exports.unpublishCourse = (0, errorHandler_1.catchAsync)(async (req, res, next) => {
    const course = await Course_1.Course.findById(req.params.id);
    if (!course) {
        return next(new errorHandler_1.AppError("Course not found", 404));
    }
    // Check if user is course instructor or admin
    if (course.instructor.toString() !== req.user._id.toString() &&
        req.user.role !== "admin") {
        return next(new errorHandler_1.AppError("Not authorized to unpublish this course", 403));
    }
    course.isPublished = false;
    await course.save();
    res.status(200).json({
        success: true,
        data: course,
        message: "Course unpublished successfully",
    });
});
