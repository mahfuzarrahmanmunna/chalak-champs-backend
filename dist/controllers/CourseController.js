"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getInstructorCourses = exports.deleteCourse = exports.updateCourse = exports.getCourseById = exports.getCourses = exports.createCourse = void 0;
const errorHandler_1 = require("../middleware/errorHandler");
const cloudinary_1 = require("../utils/cloudinary");
const cloudinary_2 = __importDefault(require("cloudinary"));
const Course_1 = __importDefault(require("../models/Course"));
// Helper: Extract Public ID from Cloudinary URL
const getPublicId = (url) => {
    const parts = url.split("/");
    const file = parts[parts.length - 1];
    return file.split(".")[0];
};
// --- CREATE ---
exports.createCourse = (0, errorHandler_1.catchAsync)(async (req, res, next) => {
    const { user } = req;
    const files = req.files;
    let thumbnailUrl;
    let videoUrl;
    try {
        // 1. Handle Thumbnail
        if (files && files.thumbnail) {
            const path = files.thumbnail[0].path;
            thumbnailUrl = await (0, cloudinary_1.uploadToCloudinary)(path, "course_thumbnails", "image");
            (0, cloudinary_1.deleteLocalFile)(path);
        }
        // 2. Handle Video
        if (files && files.video) {
            const path = files.video[0].path;
            videoUrl = await (0, cloudinary_1.uploadToCloudinary)(path, "course_videos", "video");
            (0, cloudinary_1.deleteLocalFile)(path);
        }
        // 3. Prepare Data
        const courseData = {
            ...req.body,
            instructor: user?._id || req.body.instructor,
            price: parseFloat(req.body.price),
            originalPrice: req.body.originalPrice
                ? parseFloat(req.body.originalPrice)
                : undefined,
            objectives: req.body.objectives ? JSON.parse(req.body.objectives) : [],
            requirements: req.body.requirements
                ? JSON.parse(req.body.requirements)
                : [],
            tags: req.body.tags
                ? req.body.tags.split(",").map((t) => t.trim())
                : [],
            thumbnail: thumbnailUrl,
            videoUrl: videoUrl,
            isPublished: true,
            publishedAt: new Date(),
        };
        const course = await Course_1.default.create(courseData);
        res.status(201).json({
            success: true,
            data: course,
            message: "Course created successfully",
        });
    }
    catch (error) {
        if (files?.thumbnail)
            (0, cloudinary_1.deleteLocalFile)(files.thumbnail[0].path);
        if (files?.video)
            (0, cloudinary_1.deleteLocalFile)(files.video[0].path);
        return next(new errorHandler_1.AppError(error.message || "Failed to create course", 500));
    }
});
// --- GET ALL ---
exports.getCourses = (0, errorHandler_1.catchAsync)(async (req, res, next) => {
    const { search, category, level, page = 1, limit = 10 } = req.query;
    const query = {};
    if (category)
        query.category = category;
    if (level)
        query.level = level;
    if (search) {
        query.$or = [
            { title: { $regex: search, $options: "i" } },
            { description: { $regex: search, $options: "i" } },
            { tags: { $in: [new RegExp(search, "i")] } },
        ];
    }
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;
    const courses = await Course_1.default.find(query)
        .populate("instructor", "name email avatar")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum);
    const total = await Course_1.default.countDocuments(query);
    res.status(200).json({
        success: true,
        count: courses.length,
        pagination: { page: pageNum, pages: Math.ceil(total / limitNum), total },
        data: courses,
    });
});
// --- GET ONE ---
exports.getCourseById = (0, errorHandler_1.catchAsync)(async (req, res, next) => {
    const course = await Course_1.default.findById(req.params.id).populate("instructor", "name email bio");
    if (!course) {
        return next(new errorHandler_1.AppError("Course not found", 404));
    }
    res.status(200).json({
        success: true,
        data: course,
    });
});
// --- UPDATE ---
exports.updateCourse = (0, errorHandler_1.catchAsync)(async (req, res, next) => {
    let course = await Course_1.default.findById(req.params.id);
    if (!course)
        return next(new errorHandler_1.AppError("Course not found", 404));
    // Authorization Check
    if (course.instructor.toString() !== req.user._id.toString() &&
        req.user.role !== "admin") {
        return next(new errorHandler_1.AppError("Not authorized to update this course", 403));
    }
    const files = req.files;
    const updateData = { ...req.body };
    // Handle Price conversion
    if (req.body.price)
        updateData.price = parseFloat(req.body.price);
    if (req.body.originalPrice)
        updateData.originalPrice = parseFloat(req.body.originalPrice);
    // Handle Arrays
    if (req.body.objectives)
        updateData.objectives = JSON.parse(req.body.objectives);
    if (req.body.requirements)
        updateData.requirements = JSON.parse(req.body.requirements);
    if (req.body.tags)
        updateData.tags = req.body.tags.split(",").map((t) => t.trim());
    // 1. Handle Thumbnail Update
    if (files && files.thumbnail) {
        // Delete old thumbnail from Cloudinary if it exists
        if (course.thumbnail) {
            const publicId = `course_thumbnails/${getPublicId(course.thumbnail)}`;
            await cloudinary_2.default.v2.uploader.destroy(publicId);
        }
        // Upload new
        const path = files.thumbnail[0].path;
        updateData.thumbnail = await (0, cloudinary_1.uploadToCloudinary)(path, "course_thumbnails", "image");
        (0, cloudinary_1.deleteLocalFile)(path);
    }
    // 2. Handle Video Update
    if (files && files.video) {
        // Delete old video
        if (course.videoUrl) {
            const publicId = `course_videos/${getPublicId(course.videoUrl)}`;
            await cloudinary_2.default.v2.uploader.destroy(publicId, {
                resource_type: "video",
            });
        }
        // Upload new
        const path = files.video[0].path;
        updateData.videoUrl = await (0, cloudinary_1.uploadToCloudinary)(path, "course_videos", "video");
        (0, cloudinary_1.deleteLocalFile)(path);
    }
    course = await Course_1.default.findByIdAndUpdate(req.params.id, updateData, {
        new: true,
        runValidators: true,
    });
    res.status(200).json({
        success: true,
        data: course,
        message: "Course updated successfully",
    });
});
// --- DELETE ---
exports.deleteCourse = (0, errorHandler_1.catchAsync)(async (req, res, next) => {
    const course = await Course_1.default.findById(req.params.id);
    if (!course)
        return next(new errorHandler_1.AppError("Course not found", 404));
    // Authorization Check
    if (course.instructor.toString() !== req.user._id.toString() &&
        req.user.role !== "admin") {
        return next(new errorHandler_1.AppError("Not authorized to delete this course", 403));
    }
    // Delete Assets from Cloudinary
    if (course.thumbnail) {
        await cloudinary_2.default.v2.uploader.destroy(`course_thumbnails/${getPublicId(course.thumbnail)}`);
    }
    if (course.videoUrl) {
        await cloudinary_2.default.v2.uploader.destroy(`course_videos/${getPublicId(course.videoUrl)}`, { resource_type: "video" });
    }
    await Course_1.default.findByIdAndDelete(req.params.id);
    res.status(200).json({
        success: true,
        message: "Course deleted successfully",
    });
});
// --- GET COURSES BY INSTRUCTOR (My Courses) ---
exports.getInstructorCourses = (0, errorHandler_1.catchAsync)(async (req, res, next) => {
    const courses = await Course_1.default.find({ instructor: req.user._id }).sort({
        createdAt: -1,
    });
    res.status(200).json({
        success: true,
        count: courses.length,
        data: courses,
    });
});
