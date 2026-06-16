"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteCourse = exports.updateCourse = exports.getInstructorCourses = exports.getCourseById = exports.getAllCourses = exports.createCourse = void 0;
const errorHandler_1 = require("../middleware/errorHandler");
const imgbb_1 = require("../utils/imgbb");
const Course_1 = __importDefault(require("../models/Course"));
// --- CONTROLLERS ---
// 1. CREATE COURSE
exports.createCourse = (0, errorHandler_1.catchAsync)(async (req, res, next) => {
    const { user } = req;
    const files = req.files;
    let thumbnailData;
    let videoData;
    try {
        // 1. Handle Thumbnail Upload
        if (files && files.thumbnail && files.thumbnail[0]) {
            const file = files.thumbnail[0];
            const payload = file.buffer ? file.buffer : file.path;
            thumbnailData = await (0, imgbb_1.uploadToImgBB)(payload);
            if (file.path) {
                (0, imgbb_1.deleteLocalFile)(file.path);
            }
        }
        // 2. Handle Video Upload
        if (files && files.video && files.video[0]) {
            const file = files.video[0];
            const payload = file.buffer ? file.buffer : file.path;
            videoData = await (0, imgbb_1.uploadToImgBB)(payload);
            if (file.path) {
                (0, imgbb_1.deleteLocalFile)(file.path);
            }
        }
        // 3. Parse JSON Data (Sent as strings from FormData)
        const parseJSON = (value) => {
            if (!value)
                return undefined;
            try {
                return JSON.parse(value);
            }
            catch (e) {
                console.error("JSON Parse Error:", e);
                return value; // return raw value if parse fails
            }
        };
        const courseData = {
            ...req.body,
            instructor: user?._id || req.body.instructor,
            price: parseFloat(req.body.price),
            originalPrice: req.body.originalPrice
                ? parseFloat(req.body.originalPrice)
                : undefined,
            // Parse Bilingual/Array fields
            title: parseJSON(req.body.title),
            heroSubtitle: parseJSON(req.body.heroSubtitle),
            quickInfo: parseJSON(req.body.quickInfo) || [],
            levels: parseJSON(req.body.levels) || [],
            features: parseJSON(req.body.features) || [],
            faqs: parseJSON(req.body.faqs) || [],
            resources: parseJSON(req.body.resources) || [],
            // ✅ FIX: Save Quill HTML from the admin form into a localized description object
            description: {
                en: req.body.contentEn || "",
                bn: req.body.contentBn || "",
            },
            // Save ImgBB URLs
            thumbnail: thumbnailData?.url,
            thumbnailDeleteUrl: thumbnailData?.deleteUrl,
            videoUrl: videoData?.url,
            videoDeleteUrl: videoData?.deleteUrl,
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
        // Cleanup local files if DB save fails
        if (files?.thumbnail?.[0]?.path) {
            (0, imgbb_1.deleteLocalFile)(files.thumbnail[0].path);
        }
        if (files?.video?.[0]?.path) {
            (0, imgbb_1.deleteLocalFile)(files.video[0].path);
        }
        return next(new errorHandler_1.AppError(error.message || "Failed to create course", 500));
    }
});
// 2. GET ALL COURSES (Public)
exports.getAllCourses = (0, errorHandler_1.catchAsync)(async (req, res, next) => {
    const courses = await Course_1.default.find({ isPublished: true })
        .populate("instructor", "name email")
        .sort("-createdAt");
    res.status(200).json({
        success: true,
        count: courses.length,
        data: courses,
    });
});
// 3. GET SINGLE COURSE (Public)
exports.getCourseById = (0, errorHandler_1.catchAsync)(async (req, res, next) => {
    const course = await Course_1.default.findById(req.params.id).populate("instructor", "name email");
    if (!course) {
        return next(new errorHandler_1.AppError("Course not found", 404));
    }
    res.status(200).json({
        success: true,
        data: course,
    });
});
// 4. GET INSTRUCTOR COURSES (Protected)
exports.getInstructorCourses = (0, errorHandler_1.catchAsync)(async (req, res, next) => {
    const courses = await Course_1.default.find({ instructor: req.user?._id }).sort("-createdAt");
    res.status(200).json({
        success: true,
        count: courses.length,
        data: courses,
    });
});
// 5. UPDATE COURSE
exports.updateCourse = (0, errorHandler_1.catchAsync)(async (req, res, next) => {
    const { id } = req.params;
    const files = req.files;
    let course = await Course_1.default.findById(id);
    if (!course) {
        return next(new errorHandler_1.AppError("Course not found", 404));
    }
    // Authorization
    if (course.instructor.toString() !== req.user?._id.toString() &&
        req.user?.role !== "admin") {
        return next(new errorHandler_1.AppError("Not authorized to update this course", 403));
    }
    try {
        // Handle Thumbnail Update
        if (files && files.thumbnail && files.thumbnail[0]) {
            if (course.thumbnailDeleteUrl) {
                await (0, imgbb_1.deleteFromImgBB)(course.thumbnailDeleteUrl);
            }
            const file = files.thumbnail[0];
            const payload = file.buffer ? file.buffer : file.path;
            const newData = await (0, imgbb_1.uploadToImgBB)(payload);
            course.thumbnail = newData.url;
            course.thumbnailDeleteUrl = newData.deleteUrl;
            if (file.path) {
                (0, imgbb_1.deleteLocalFile)(file.path);
            }
        }
        // Handle Video Update
        if (files && files.video && files.video[0]) {
            if (course.videoDeleteUrl) {
                await (0, imgbb_1.deleteFromImgBB)(course.videoDeleteUrl);
            }
            const file = files.video[0];
            const payload = file.buffer ? file.buffer : file.path;
            const newData = await (0, imgbb_1.uploadToImgBB)(payload);
            course.videoUrl = newData.url;
            course.videoDeleteUrl = newData.deleteUrl;
            if (file.path) {
                (0, imgbb_1.deleteLocalFile)(file.path);
            }
        }
        // Update Text Fields
        const { title, heroSubtitle, price, originalPrice, category, level, isPublished, quickInfo, levels, features, faqs, offerDetails, courseOverview, instructorName, duration, } = req.body;
        // Helper to safely parse JSON
        const parseJSON = (value) => {
            if (!value)
                return undefined;
            try {
                return JSON.parse(value);
            }
            catch (e) {
                console.error("JSON Parse Error:", e);
                return value;
            }
        };
        if (title)
            course.title = parseJSON(title);
        if (heroSubtitle)
            course.heroSubtitle = parseJSON(heroSubtitle);
        // ✅ FIX: Map Quill content properly for Update
        if (req.body.contentEn !== undefined ||
            req.body.contentBn !== undefined) {
            course.description = {
                en: req.body.contentEn !== undefined
                    ? req.body.contentEn
                    : course.description?.en || "",
                bn: req.body.contentBn !== undefined
                    ? req.body.contentBn
                    : course.description?.bn || "",
            };
        }
        if (price)
            course.price = parseFloat(price);
        if (originalPrice)
            course.originalPrice = parseFloat(originalPrice);
        if (category)
            course.category = category;
        if (level)
            course.level = level;
        if (instructorName)
            course.instructorName = instructorName;
        if (duration)
            course.duration = duration;
        if (typeof isPublished !== "undefined") {
            course.isPublished = isPublished;
            course.publishedAt = isPublished ? new Date() : undefined;
        }
        if (offerDetails)
            course.offerDetails = offerDetails;
        if (courseOverview)
            course.courseOverview = courseOverview;
        // Parse Complex Fields
        if (quickInfo)
            course.quickInfo = parseJSON(quickInfo);
        if (levels)
            course.levels = parseJSON(levels);
        if (features)
            course.features = parseJSON(features);
        if (faqs)
            course.faqs = parseJSON(faqs);
        await course.save();
        res.status(200).json({
            success: true,
            data: course,
            message: "Course updated successfully",
        });
    }
    catch (error) {
        // Cleanup local files if DB save fails
        if (files?.thumbnail?.[0]?.path) {
            (0, imgbb_1.deleteLocalFile)(files.thumbnail[0].path);
        }
        if (files?.video?.[0]?.path) {
            (0, imgbb_1.deleteLocalFile)(files.video[0].path);
        }
        return next(new errorHandler_1.AppError(error.message || "Failed to update course", 500));
    }
});
// 6. DELETE COURSE
exports.deleteCourse = (0, errorHandler_1.catchAsync)(async (req, res, next) => {
    const { id } = req.params;
    const course = await Course_1.default.findById(id);
    if (!course) {
        return next(new errorHandler_1.AppError("Course not found", 404));
    }
    // Authorization
    if (course.instructor.toString() !== req.user?._id.toString() &&
        req.user?.role !== "admin") {
        return next(new errorHandler_1.AppError("Not authorized to delete this course", 403));
    }
    try {
        // 1. Delete Assets from ImgBB
        if (course.thumbnailDeleteUrl) {
            await (0, imgbb_1.deleteFromImgBB)(course.thumbnailDeleteUrl);
        }
        if (course.videoDeleteUrl) {
            await (0, imgbb_1.deleteFromImgBB)(course.videoDeleteUrl);
        }
        // 2. Delete DB Record
        await course.deleteOne();
        res.status(200).json({
            success: true,
            message: "Course deleted successfully",
        });
    }
    catch (error) {
        return next(new errorHandler_1.AppError(error.message || "Failed to delete course", 500));
    }
});
